<?php

namespace App\Http\Controllers;

use App\Events\FallDetected;
use App\Models\FallAlert;
use App\Models\MonitoringSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CameraStreamController extends Controller
{
    private const PYTHON_SERVICE_URL = 'http://localhost:8080';

    /**
     * Stream de vídeo MJPEG do Python
     */
    public function stream(MonitoringSession $session)
    {
        $this->authorize('view', $session);

        return new StreamedResponse(function () use ($session) {
            set_time_limit(0);

            $ch = curl_init(self::PYTHON_SERVICE_URL . '/video_feed');
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => false,
                CURLOPT_HEADER => false,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_CONNECTTIMEOUT => 10,
                CURLOPT_TIMEOUT => 0,
                CURLOPT_WRITEFUNCTION => function ($curl, $data) {
                    echo $data;
                    if (ob_get_level() > 0) {
                        ob_flush();
                    }
                    flush();

                    if (connection_aborted()) {
                        return 0;
                    }

                    return strlen($data);
                },
            ]);

            curl_exec($ch);

            if (curl_errno($ch)) {
                Log::error('Stream error', [
                    'error' => curl_error($ch),
                    'session_id' => $session->id
                ]);
            }

            curl_close($ch);
        }, 200, [
            'Content-Type' => 'multipart/x-mixed-replace; boundary=frame',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => '0',
            'X-Accel-Buffering' => 'no',
            'Connection' => 'keep-alive',
        ]);
    }

    /**
     * Verificar status do Python pipeline
     */
    public function checkStatus(MonitoringSession $session)
    {
        $this->authorize('view', $session);

        try {
            $response = Http::timeout(3)->get(self::PYTHON_SERVICE_URL . '/status');

            if ($response->successful()) {
                $data = $response->json();

                Log::info('Python status check', [
                    'session_id' => $session->id,
                    'fall_detected' => $data['fall_detected'] ?? false,
                    'python_session_id' => $data['session_id'] ?? null
                ]);

                return response()->json($data);
            }
        } catch (\Exception $e) {
            Log::error('Failed to check Python status', [
                'session_id' => $session->id,
                'error' => $e->getMessage()
            ]);
        }

        return response()->json([
            'fall_detected' => false,
            'error' => 'Service unavailable'
        ], 503);
    }

    /**
     * Iniciar monitoramento
     */
    public function startMonitoring(MonitoringSession $session)
    {
        $this->authorize('view', $session);

        try {
            Log::info('Starting monitoring', [
                'session_id' => $session->id,
                'camera_url' => $session->camera_url,
                'camera_type' => $session->camera_type
            ]);

            $response = Http::timeout(10)->post(self::PYTHON_SERVICE_URL . '/start', [
                'session_id' => $session->id,
                'camera_url' => $session->camera_url,
                'camera_type' => $session->camera_type
            ]);

            if ($response->successful()) {
                $data = $response->json();

                if ($data['success'] ?? false) {
                    $session->update([
                        'status' => 'active',
                        'last_activity_at' => now()
                    ]);

                    Log::info('Monitoring started successfully', [
                        'session_id' => $session->id
                    ]);

                    return response()->json([
                        'success' => true,
                        'message' => 'Monitoramento iniciado com sucesso'
                    ]);
                }
            }

            Log::warning('Python service returned unsuccessful response', [
                'session_id' => $session->id,
                'response' => $response->body()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Falha ao iniciar monitoramento no Python service'
            ], 503);

        } catch (\Exception $e) {
            Log::error('Failed to start monitoring', [
                'session_id' => $session->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao conectar com serviço Python: ' . $e->getMessage()
            ], 503);
        }
    }

    /**
     * Parar monitoramento
     */
    public function stopMonitoring(MonitoringSession $session)
    {
        $this->authorize('view', $session);

        try {
            Log::info('Stopping monitoring', ['session_id' => $session->id]);

            $response = Http::timeout(5)->post(self::PYTHON_SERVICE_URL . '/stop', [
                'session_id' => $session->id
            ]);

            $session->update([
                'status' => 'inactive',
                'last_activity_at' => now()
            ]);

            Log::info('Monitoring stopped', ['session_id' => $session->id]);

            return response()->json(['success' => true]);

        } catch (\Exception $e) {
            Log::error('Failed to stop monitoring', [
                'session_id' => $session->id,
                'error' => $e->getMessage()
            ]);

            // Mesmo com erro, marcar como inativo
            $session->update(['status' => 'inactive']);

            return response()->json([
                'success' => true,
                'warning' => 'Python service may still be running'
            ]);
        }
    }

    /**
     * Webhook recebido do Python quando detecta queda
     */
    public function handleFallDetection(Request $request)
    {
        $validated = $request->validate([
            'session_id' => 'required|integer|exists:monitoring_sessions,id',
            'confidence_score' => 'nullable|numeric|min:0|max:100',
            'snapshot_base64' => 'nullable|string',
        ]);

        try {
            $session = MonitoringSession::findOrFail($validated['session_id']);

            // Salvar snapshot se fornecido
            $snapshotPath = null;
            if (!empty($validated['snapshot_base64'])) {
                $snapshotPath = $this->saveSnapshot(
                    $validated['snapshot_base64'],
                    $session->id
                );
            }

            // Criar alerta
            $alert = FallAlert::create([
                'monitoring_session_id' => $session->id,
                'detected_at' => now(),
                'confidence_score' => $validated['confidence_score'] ?? 95.0,
                'snapshot_path' => $snapshotPath,
                'status' => 'pending',
                'detection_metadata' => [
                    'source' => 'python_pipeline',
                    'algorithm' => 'mediapipe_pose',
                    'timestamp' => now()->toIso8601String()
                ]
            ]);

            // Broadcast evento para WebSocket
            broadcast(new FallDetected($alert))->toOthers();

            Log::info('Fall detected and alert created', [
                'alert_id' => $alert->id,
                'session_id' => $session->id,
                'confidence' => $alert->confidence_score
            ]);

            return response()->json([
                'success' => true,
                'alert_id' => $alert->id
            ], 201);

        } catch (\Exception $e) {
            Log::error('Failed to handle fall detection', [
                'error' => $e->getMessage(),
                'request' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Salvar snapshot da queda
     */
    private function saveSnapshot(string $base64Data, int $sessionId): string
    {
        try {
            // Remover prefixo data:image se existir
            $base64Data = preg_replace('/^data:image\/\w+;base64,/', '', $base64Data);

            $imageData = base64_decode($base64Data);

            if ($imageData === false) {
                throw new \Exception('Invalid base64 data');
            }

            $filename = 'fall_' . $sessionId . '_' . time() . '.jpg';
            $path = 'snapshots/' . date('Y/m');
            $fullPath = storage_path('app/public/' . $path);

            if (!file_exists($fullPath)) {
                mkdir($fullPath, 0755, true);
            }

            $filePath = $fullPath . '/' . $filename;
            file_put_contents($filePath, $imageData);

            return '/storage/' . $path . '/' . $filename;

        } catch (\Exception $e) {
            Log::error('Failed to save snapshot', [
                'error' => $e->getMessage(),
                'session_id' => $sessionId
            ]);
            return null;
        }
    }

    /**
     * Health check do Python service
     */
    public function healthCheck()
    {
        try {
            $response = Http::timeout(3)->get(self::PYTHON_SERVICE_URL . '/health');

            if ($response->successful()) {
                return response()->json([
                    'status' => 'ok',
                    'python_service' => 'online',
                    'data' => $response->json()
                ]);
            }

            return response()->json([
                'status' => 'error',
                'python_service' => 'offline'
            ], 503);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'python_service' => 'offline',
                'error' => $e->getMessage()
            ], 503);
        }
    }
}
