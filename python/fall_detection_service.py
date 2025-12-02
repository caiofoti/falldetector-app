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
CORS(app, resources={r"/*": {"origins": "*"}})

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

mp_pose = mp.solutions.pose
pose = mp_pose.Pose(
    min_detection_confidence=0.4,  # Reduzido de 0.5 para 0.4 - detecta poses com mais facilidade
    min_tracking_confidence=0.4,  # Reduzido de 0.5 para 0.4 - rastreia melhor em movimentos rápidos
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

current_session: Optional[MonitoringSession] = None
session_lock = threading.Lock()

LARAVEL_BASE_URL = 'http://localhost:8000'
WEBHOOK_ENDPOINT = f'{LARAVEL_BASE_URL}/api/fall-detected'

def generate_frames():
    """Gera frames para streaming"""
    global current_session

    while current_session and current_session.is_running:
        if current_session.frame_output is not None:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + current_session.frame_output + b'\r\n')
        time.sleep(0.033)  # ~30 FPS

@app.route('/video_feed')
def video_feed():
    """Stream de vídeo"""
    try:
        if not current_session or not current_session.is_running:
            logger.error("No active session for video feed")
            return jsonify({'error': 'No active monitoring session'}), 404

        logger.info(f"Starting video feed for session {current_session.session_id}")
        return Response(
            generate_frames(),
            mimetype='multipart/x-mixed-replace; boundary=frame'
        )
    except Exception as e:
        logger.error(f"Error in video_feed: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/available_cameras', methods=['GET'])
def available_cameras():
    """Lista câmeras disponíveis"""
    available = []
    for i in range(5):
        cap = cv2.VideoCapture(i)
        if cap.isOpened():
            ret, frame = cap.read()
            if ret:
                available.append({
                    'index': i,
                    'name': f'Camera {i}'
                })
            cap.release()

    logger.info(f"Câmeras disponíveis: {available}")
    return jsonify({'cameras': available})

@app.route('/status')
def status():
    """Status atual do sistema"""
    global current_session

    if current_session and current_session.is_running:
        return jsonify({
            "status": "monitoring",
            "fall_detected": current_session.fall_detected,
            "session_id": current_session.session_id,
            "is_running": current_session.is_running,
            "timestamp": time.time()
        })

    return jsonify({
        "status": "idle",
        "fall_detected": False,
        "is_running": False,
        "session_id": None,
        "timestamp": time.time()
    })

@app.route('/start', methods=['POST'])
def start_monitoring():
    """Iniciar nova sessão de monitoramento"""
    global current_session

    try:
        data = request.json
        if not data:
            return jsonify({
                "success": False,
                "error": "No JSON data provided"
            }), 400

        session_id = data.get('session_id')
        camera_url = data.get('camera_url', '0')
        camera_type = data.get('camera_type', 'webcam')

        if not session_id:
            return jsonify({
                "success": False,
                "error": "session_id is required"
            }), 400

        logger.info(f"Starting session {session_id} - Type: {camera_type}, URL: {camera_url}")

        with session_lock:
            # Parar sessão anterior se existir
            if current_session and current_session.is_running:
                logger.info(f"Stopping previous session {current_session.session_id}")
                stop_current_session()
                time.sleep(0.5)  # Aguardar liberação da câmera

            # Abrir câmera
            if camera_type == 'webcam':
                try:
                    camera_index = int(camera_url)
                except (ValueError, TypeError):
                    camera_index = 0

                logger.info(f"Opening webcam with index: {camera_index}")
                camera = cv2.VideoCapture(camera_index, cv2.CAP_DSHOW)  # Windows
            else:
                logger.info(f"Opening IP camera: {camera_url}")
                camera = cv2.VideoCapture(camera_url)

            if not camera.isOpened():
                logger.error(f"Cannot open camera: {camera_url}")
                return jsonify({
                    "success": False,
                    "error": f"Cannot open camera {camera_url}"
                }), 500

            # Configurar câmera
            camera.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
            camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
            camera.set(cv2.CAP_PROP_FPS, 60)
            camera.set(cv2.CAP_PROP_BUFFERSIZE, 1)

            # Testar leitura
            ret, test_frame = camera.read()
            if not ret or test_frame is None:
                logger.error("Cannot read from camera")
                camera.release()
                return jsonify({
                    "success": False,
                    "error": "Cannot read frames from camera"
                }), 500

            logger.info(f"Camera opened successfully. Frame shape: {test_frame.shape}")

            # Criar sessão
            current_session = MonitoringSession(
                session_id=session_id,
                camera=camera,
                is_running=True
            )

            # Iniciar thread de processamento
            processing_thread = threading.Thread(target=process_video, daemon=True)
            processing_thread.start()
            current_session.processing_thread = processing_thread


            logger.info(f"✅ Successfully started monitoring session {session_id}")
            return jsonify({
                "success": True,
                "session_id": session_id,
                "message": "Monitoring started successfully"
            })

    except Exception as e:
        logger.error(f"❌ Error starting monitoring: {str(e)}", exc_info=True)
        if current_session and current_session.camera:
            current_session.camera.release()
            current_session = None
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
        }), 404

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

        # Limpar recursos do OpenCV
        cv2.destroyAllWindows()

def trigger_webhook(session_id: int, confidence: float, snapshot: Optional[np.ndarray] = None):
    """Notificar Laravel sobre queda detectada"""
    try:
        payload = {
            'session_id': session_id,
            'confidence_score': round(confidence, 2),
        }

        if snapshot is not None:
            try:
                height, width = snapshot.shape[:2]
                if width > 640:
                    scale = 640 / width
                    new_width = 640
                    new_height = int(height * scale)
                    snapshot = cv2.resize(snapshot, (new_width, new_height))

                _, buffer = cv2.imencode('.jpg', snapshot, [cv2.IMWRITE_JPEG_QUALITY, 60])
                snapshot_base64 = base64.b64encode(buffer).decode('utf-8')
                payload['snapshot_base64'] = snapshot_base64
            except Exception as e:
                logger.error(f"Error encoding snapshot: {str(e)}")

        logger.info(f"Sending webhook to {WEBHOOK_ENDPOINT}")

        response = requests.post(
            WEBHOOK_ENDPOINT,
            json=payload,
            timeout=5,
            headers={'Content-Type': 'application/json'}
        )

        if response.status_code == 201:
            result = response.json()
            logger.info(f"✅ Webhook successful! Alert ID: {result.get('alert_id')}")
            return True
        else:
            logger.warning(f"⚠️ Webhook returned {response.status_code}")
            return False

    except Exception as e:
        logger.error(f"❌ Webhook error: {str(e)}")
        return False

def calculate_fall_confidence(landmarks) -> tuple[bool, float]:
    """Calcular confiança de detecção de queda - VERSÃO MAIS SENSÍVEL"""
    try:
        # Landmarks principais
        left_shoulder = landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER]
        left_hip = landmarks[mp_pose.PoseLandmark.LEFT_HIP]
        right_shoulder = landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER]
        right_hip = landmarks[mp_pose.PoseLandmark.RIGHT_HIP]
        nose = landmarks[mp_pose.PoseLandmark.NOSE]

        # Calcular diferenças verticais (Y) - quanto menor, mais horizontal está o corpo
        left_vertical_diff = abs(left_shoulder.y - left_hip.y)
        right_vertical_diff = abs(right_shoulder.y - right_hip.y)
        vertical_diff = min(left_vertical_diff, right_vertical_diff)

        # Calcular diferenças horizontais (X) - corpo deitado tem ombro e quadril alinhados no eixo X
        left_horizontal_diff = abs(left_shoulder.x - left_hip.x)
        right_horizontal_diff = abs(right_shoulder.x - right_hip.x)
        horizontal_diff = max(left_horizontal_diff, right_horizontal_diff)

        # Calcular altura do nariz em relação aos quadris
        avg_hip_y = (left_hip.y + right_hip.y) / 2
        nose_height = avg_hip_y - nose.y  # Positivo = nariz acima dos quadris, negativo = abaixo

        fall_detected = False
        confidence = 0.0

        # CRITÉRIO 1: Corpo horizontal (vertical_diff pequeno)
        # THRESHOLD AUMENTADO: 0.1 → 0.18 (80% mais sensível!)
        if vertical_diff < 0.18:
            conf = (1 - vertical_diff / 0.18) * 100
            confidence = max(confidence, conf)
            fall_detected = True

        # CRITÉRIO 2: Cabeça muito baixa (nariz próximo ou abaixo do nível dos quadris)
        if nose_height < 0.15:  # Nariz próximo do nível dos quadris
            conf = max(85.0, (0.15 - nose_height) * 300)
            confidence = max(confidence, min(100.0, conf))
            fall_detected = True

        # CRITÉRIO 3: Grande distância horizontal entre ombros e quadris (corpo esticado horizontalmente)
        if horizontal_diff > 0.12:
            conf = min(100, horizontal_diff * 500)
            confidence = max(confidence, conf)
            fall_detected = True

        return fall_detected, min(100.0, confidence)

    except Exception as e:
        logger.error(f"Error calculating fall confidence: {str(e)}")
        return False, 0.0

def process_video():
    """Thread principal de processamento de vídeo"""
    global current_session

    logger.info("🎥 Video processing thread started")

    consecutive_fall_frames = 0
    fall_threshold_frames = 12  # Reduzido de 30 para 12 (0.4 segundos a 30fps) - MUITO MAIS RÁPIDO!
    last_webhook_time = 0
    webhook_cooldown = 30

    while current_session and current_session.is_running:
        try:
            success, frame = current_session.camera.read()

            if not success or frame is None:
                logger.warning("Failed to read frame")
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

                            logger.warning(f"⚠️ FALL DETECTED! Session: {current_session.session_id}, Confidence: {confidence:.1f}%")

                            current_time = time.time()
                            if current_time - last_webhook_time > webhook_cooldown:
                                threading.Thread(
                                    target=trigger_webhook,
                                    args=(current_session.session_id, confidence, frame.copy()),
                                    daemon=True
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
                f"Session: {current_session.session_id}",
                (10, frame.shape[0] - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (255, 255, 255),
                1
            )

            status_color = (0, 255, 0) if not current_session.fall_detected else (0, 0, 255)
            cv2.circle(frame, (frame.shape[1] - 30, 30), 10, status_color, -1)

            ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            if ret:
                current_session.frame_output = buffer.tobytes()

        except Exception as e:
            logger.error(f"Error processing frame: {str(e)}", exc_info=True)
            time.sleep(0.1)

    logger.info("🛑 Video processing thread stopped")

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": time.time(),
        "active_session": current_session.session_id if current_session else None,
        "is_monitoring": current_session is not None and current_session.is_running
    })

@app.route('/')
def index():
    """Página inicial"""
    return jsonify({
        "service": "Fall Detection Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "status": "/status",
            "video_feed": "/video_feed",
            "available_cameras": "/available_cameras",
            "start": "/start (POST)",
            "stop": "/stop (POST)"
        }
    })

if __name__ == '__main__':
    logger.info("=" * 60)
    logger.info("🚀 Fall Detection Service Starting")
    logger.info("📡 Port: 8080")
    logger.info("🔗 Laravel Webhook: " + WEBHOOK_ENDPOINT)
    logger.info("=" * 60)

    app.run(
        host='0.0.0.0',
        port=8080,
        debug=False,
        threaded=True
    )
