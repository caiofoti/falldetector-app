from flask import Flask, Response, jsonify, request
from flask_cors import CORS
import cv2
import mediapipe as mp
import numpy as np
import time
import threading
import requests
import base64
from dataclasses import dataclass
from typing import Optional
import logging

app = Flask(__name__)
CORS(app)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

mp_pose = mp.solutions.pose
pose = mp_pose.Pose(
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
    model_complexity=1
)
mp_drawing = mp.solutions.drawing_utils

@dataclass
class MonitoringSession:
    session_id: int
    camera: cv2.VideoCapture
    fall_detected: bool = False
    fall_time: float = 0
    frame_output: Optional[bytes] = None
    is_running: bool = True
    last_snapshot: Optional[bytes] = None
    processing_thread: Optional[threading.Thread] = None

active_sessions = {}
current_session: Optional[MonitoringSession] = None
session_lock = threading.Lock()

LARAVEL_BASE_URL = 'http://localhost:8000'
WEBHOOK_ENDPOINT = f'{LARAVEL_BASE_URL}/api/fall-detected'

@app.route('/video_feed')
def video_feed():
    """Stream MJPEG de vídeo"""
    def generate():
        global current_session
        while current_session and current_session.is_running:
            if current_session.frame_output is not None:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' +
                       current_session.frame_output + b'\r\n')
            time.sleep(0.033)

    return Response(generate(),
                   mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/status')
def status():
    """Status atual do sistema"""
    global current_session
    if current_session:
        return jsonify({
            "fall_detected": current_session.fall_detected,
            "session_id": current_session.session_id,
            "is_running": current_session.is_running,
            "timestamp": time.time()
        })
    return jsonify({
        "fall_detected": False,
        "is_running": False,
        "error": "No active session",
        "timestamp": time.time()
    })

@app.route('/start', methods=['POST'])
def start_monitoring():
    """Iniciar nova sessão de monitoramento"""
    global current_session

    try:
        data = request.json
        session_id = data.get('session_id')
        camera_url = data.get('camera_url', '0')
        camera_type = data.get('camera_type', 'webcam')

        logger.info(f"Starting session {session_id} - Type: {camera_type}, URL: {camera_url}")

        with session_lock:
            if current_session and current_session.is_running:
                logger.info(f"Stopping previous session {current_session.session_id}")
                stop_current_session()

            if camera_type == 'webcam':
                try:
                    camera_index = int(camera_url)
                except ValueError:
                    camera_index = camera_url

                camera = cv2.VideoCapture(camera_index)
            else:
                camera = cv2.VideoCapture(camera_url)

            if not camera.isOpened():
                logger.error(f"Cannot open camera: {camera_url}")
                return jsonify({
                    "success": False,
                    "error": "Cannot open camera"
                }), 500

            camera.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
            camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
            camera.set(cv2.CAP_PROP_FPS, 30)

            ret, test_frame = camera.read()
            if not ret:
                logger.error("Cannot read from camera")
                camera.release()
                return jsonify({
                    "success": False,
                    "error": "Cannot read from camera"
                }), 500

            current_session = MonitoringSession(
                session_id=session_id,
                camera=camera,
                is_running=True
            )

            processing_thread = threading.Thread(target=process_video, daemon=True)
            processing_thread.start()
            current_session.processing_thread = processing_thread

            logger.info(f"Successfully started monitoring session {session_id}")
            return jsonify({
                "success": True,
                "session_id": session_id,
                "message": "Monitoring started successfully"
            })

    except Exception as e:
        logger.error(f"Error starting monitoring: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/stop', methods=['POST'])
def stop_monitoring():
    """Parar monitoramento atual"""
    global current_session

    try:
        with session_lock:
            if current_session:
                session_id = current_session.session_id
                stop_current_session()
                logger.info(f"Stopped monitoring session {session_id}")
                return jsonify({
                    "success": True,
                    "message": f"Session {session_id} stopped"
                })
        return jsonify({
            "success": False,
            "error": "No active session"
        })
    except Exception as e:
        logger.error(f"Error stopping monitoring: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

def stop_current_session():
    """Helper para parar sessão atual"""
    global current_session
    if current_session:
        current_session.is_running = False
        if current_session.processing_thread:
            current_session.processing_thread.join(timeout=2)
        if current_session.camera:
            current_session.camera.release()
        current_session = None

def trigger_webhook(session_id: int, confidence: float, snapshot: Optional[np.ndarray] = None):
    """Notificar Laravel sobre queda detectada"""
    try:
        payload = {
            'session_id': session_id,
            'confidence_score': round(confidence, 2),
        }

        # Reduzir tamanho do snapshot para evitar timeout
        if snapshot is not None:
            try:
                # Redimensionar para 640x480
                height, width = snapshot.shape[:2]
                if width > 640:
                    scale = 640 / width
                    new_width = 640
                    new_height = int(height * scale)
                    snapshot = cv2.resize(snapshot, (new_width, new_height))

                _, buffer = cv2.imencode('.jpg', snapshot, [cv2.IMWRITE_JPEG_QUALITY, 60])
                snapshot_base64 = base64.b64encode(buffer).decode('utf-8')
                payload['snapshot_base64'] = snapshot_base64
                logger.info(f"Snapshot encoded, size: {len(snapshot_base64)} chars")
            except Exception as e:
                logger.error(f"Error encoding snapshot: {str(e)}")

        logger.info(f"Sending webhook to {WEBHOOK_ENDPOINT}")
        logger.info(f"Payload: session_id={session_id}, confidence={confidence:.2f}%")

        # Aumentar timeout e adicionar retry
        max_retries = 2
        for attempt in range(max_retries):
            try:
                response = requests.post(
                    WEBHOOK_ENDPOINT,
                    json=payload,
                    timeout=5,  # Reduzir para 5 segundos
                    headers={'Content-Type': 'application/json'}
                )

                logger.info(f"Webhook response status: {response.status_code}")
                logger.info(f"Webhook response body: {response.text}")

                if response.status_code == 201:
                    result = response.json()
                    logger.info(f"✅ Webhook successful! Alert ID: {result.get('alert_id')}")
                    return True
                else:
                    logger.warning(f"⚠️ Webhook returned {response.status_code}: {response.text}")
                    if attempt < max_retries - 1:
                        logger.info(f"Retrying... (attempt {attempt + 2}/{max_retries})")
                        time.sleep(1)
                        continue
                    return False

            except requests.exceptions.Timeout:
                if attempt < max_retries - 1:
                    logger.warning(f"⚠️ Timeout, retrying... (attempt {attempt + 2}/{max_retries})")
                    time.sleep(1)
                    continue
                else:
                    logger.error(f"❌ Webhook timeout after {max_retries} attempts")
                    logger.error(f"URL: {WEBHOOK_ENDPOINT}")
                    return False

            except requests.exceptions.ConnectionError as e:
                logger.error(f"❌ Connection error: {str(e)}")
                logger.error(f"Verifique se Laravel está em http://127.0.0.1:8000")
                return False

    except Exception as e:
        logger.error(f"❌ Webhook error: {str(e)}")
        return False

def calculate_fall_confidence(landmarks) -> tuple[bool, float]:
    """Calcular confiança de detecção de queda"""
    try:
        left_shoulder = landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER]
        right_shoulder = landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER]
        left_hip = landmarks[mp_pose.PoseLandmark.LEFT_HIP]
        right_hip = landmarks[mp_pose.PoseLandmark.RIGHT_HIP]

        left_diff = abs(left_shoulder.y - left_hip.y)
        right_diff = abs(right_shoulder.y - right_hip.y)
        avg_diff = (left_diff + right_diff) / 2

        shoulder_mid_y = (left_shoulder.y + right_shoulder.y) / 2
        hip_mid_y = (left_hip.y + right_hip.y) / 2
        body_vertical_diff = abs(shoulder_mid_y - hip_mid_y)

        shoulder_horizontality = abs(left_shoulder.y - right_shoulder.y)

        is_horizontal = avg_diff < 0.15
        is_level = shoulder_horizontality < 0.08

        if is_horizontal and is_level:
            confidence = min(100, (1 - avg_diff / 0.15) * 100)
            return True, confidence

        return False, 0.0

    except Exception as e:
        logger.error(f"Error calculating fall confidence: {str(e)}")
        return False, 0.0

def process_video():
    """Thread principal de processamento de vídeo"""
    global current_session

    logger.info("Video processing thread started")
    consecutive_fall_frames = 0
    fall_threshold_frames = 60
    last_webhook_time = 0
    webhook_cooldown = 30

    while current_session and current_session.is_running:
        try:
            success, frame = current_session.camera.read()
            if not success:
                logger.warning("Failed to read frame from camera")
                time.sleep(0.1)
                continue

            image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            image.flags.writeable = False
            results = pose.process(image)
            image.flags.writeable = True

            if results.pose_landmarks:
                mp_drawing.draw_landmarks(
                    frame,
                    results.pose_landmarks,
                    mp_pose.POSE_CONNECTIONS,
                    mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=2),
                    mp_drawing.DrawingSpec(color=(0, 0, 255), thickness=2, circle_radius=2)
                )

                landmarks = results.pose_landmarks.landmark
                is_fallen, confidence = calculate_fall_confidence(landmarks)

                if is_fallen:
                    consecutive_fall_frames += 1

                    cv2.putText(
                        frame,
                        f"Possivel queda: {consecutive_fall_frames}/{fall_threshold_frames} ({confidence:.1f}%)",
                        (10, 40),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.7,
                        (0, 165, 255),
                        2
                    )

                    if consecutive_fall_frames >= fall_threshold_frames:
                        if not current_session.fall_detected:
                            current_session.fall_detected = True
                            current_session.fall_time = time.time()

                            logger.warning(
                                f"FALL DETECTED in session {current_session.session_id} "
                                f"with {confidence:.1f}% confidence"
                            )

                            current_session.last_snapshot = frame.copy()

                            current_time = time.time()
                            if current_time - last_webhook_time > webhook_cooldown:
                                threading.Thread(
                                    target=trigger_webhook,
                                    args=(current_session.session_id, confidence, frame.copy())
                                ).start()
                                last_webhook_time = current_time

                        cv2.putText(
                            frame,
                            f"QUEDA DETECTADA! ({confidence:.0f}%)",
                            (10, 100),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            1.2,
                            (0, 0, 255),
                            3
                        )

                        h, w = frame.shape[:2]
                        cv2.rectangle(frame, (0, 0), (w, h), (0, 0, 255), 10)
                else:
                    if consecutive_fall_frames > 0:
                        consecutive_fall_frames -= 1

                    if consecutive_fall_frames == 0:
                        current_session.fall_detected = False

            cv2.putText(
                frame,
                f"Session: {current_session.session_id} | FPS: 30",
                (10, frame.shape[0] - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (255, 255, 255),
                1
            )

            status_color = (0, 255, 0) if not current_session.fall_detected else (0, 0, 255)
            cv2.circle(frame, (frame.shape[1] - 30, 30), 10, status_color, -1)

            ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            current_session.frame_output = buffer.tobytes()

        except Exception as e:
            logger.error(f"Error processing frame: {str(e)}", exc_info=True)
            time.sleep(0.1)

    logger.info("Video processing thread stopped")
    if current_session:
        with session_lock:
            stop_current_session()

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "ok",
        "timestamp": time.time(),
        "active_session": current_session.session_id if current_session else None,
        "is_monitoring": current_session is not None
    })

@app.route('/')
def index():
    """Página inicial"""
    return jsonify({
        "service": "FallDetector Detection Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "status": "/status",
            "video_feed": "/video_feed",
            "start": "/start (POST)",
            "stop": "/stop (POST)"
        }
    })

if __name__ == '__main__':
    logger.info("=" * 60)
    logger.info("FallDetector Detection Service Starting")
    logger.info("Port: 8080")
    logger.info("Laravel Webhook: " + WEBHOOK_ENDPOINT)
    logger.info("=" * 60)

    app.run(
        host='0.0.0.0',
        port=8080,
        debug=False,
        threaded=True
    )
