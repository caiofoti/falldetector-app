<?php

namespace App\Http\Controllers;

use App\Events\FallDetected;
use App\Models\FallAlert;
use App\Models\MonitoringSession;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\StreamedResponse;
use App\Jobs\ProcessFallDetection;

class CameraStreamController extends Controller
{
    private const PYTHON_SERVICE_URL = 'http://localhost:8080';

    public function stream(MonitoringSession $session)
    {
        $this->authorize('view', $session);

        return new StreamedResponse(function () use ($session) {
            set_time_limit(0);
            ob_implicit_flush(true);

            $ch = curl_init(self::PYTHON_SERVICE_URL . '/video_feed');
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => false,
                CURLOPT_HEADER => false,
                CURLOPT_FOLLOWLOCATION => true,
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

    public function checkStatus(MonitoringSession $session)
    {
        $this->authorize('view', $session);

        try {
            $response = Http::get(self::PYTHON_SERVICE_URL . '/status');

            if ($response->successful()) {
                $data = $response->json();

                // Keep-alive: atualizar last_activity_at se a sessão está rodando
                if (($data['is_running'] ?? false) && ($data['session_id'] ?? null) == $session->id) {
                    $session->update([
                        'status' => 'active',
                        'last_activity_at' => now()
                    ]);
                }

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

    public function startMonitoring(MonitoringSession $session)
    {
        $this->authorize('view', $session);

        try {
            Log::info('Starting monitoring', [
                'session_id' => $session->id,
                'camera_url' => $session->camera_url,
                'camera_type' => $session->camera_type
            ]);

            $response = Http::post(self::PYTHON_SERVICE_URL . '/start', [
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

    public function stopMonitoring(MonitoringSession $session)
    {
        $this->authorize('view', $session);

        try {
            Log::info('Stopping monitoring', ['session_id' => $session->id]);

            $response = Http::post(self::PYTHON_SERVICE_URL . '/stop', [
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

            $session->update(['status' => 'inactive']);

            return response()->json([
                'success' => true,
                'warning' => 'Python service may still be running'
            ]);
        }
    }

    public function handleFallDetection(Request $request)
    {
        Log::info('Fall detection webhook received', $request->all());

        try {
            $sessionId = $request->input('session_id');
            $confidence = $request->input('confidence_score', 95.0);
            $snapshotBase64 = $request->input('snapshot_base64');

            if (!$sessionId) {
                return response()->json(['success' => false, 'error' => 'No session_id'], 400);
            }

            $session = MonitoringSession::find($sessionId);
            if (!$session) {
                return response()->json(['success' => false, 'error' => 'Session not found'], 404);
            }

            // Processar síncronamente para garantir tempo real
            $snapshotPath = null;
            if ($snapshotBase64) {
                $snapshotPath = $this->saveSnapshot($snapshotBase64, $session->id);
            }

            $alert = FallAlert::create([
                'monitoring_session_id' => $session->id,
                'detected_at' => now(),
                'confidence_score' => $confidence,
                'snapshot_path' => $snapshotPath,
                'status' => 'pending',
                'detection_metadata' => [
                    'source' => 'python_pipeline',
                    'algorithm' => 'mediapipe_pose',
                    'timestamp' => now()->toIso8601String()
                ]
            ]);

            $session->update(['last_activity_at' => now()]);

            // Criar notificação para o usuário
            Notification::create([
                'user_id' => $session->user_id,
                'fall_alert_id' => $alert->id,
                'type' => 'fall_detected',
                'title' => 'Queda Detectada!',
                'message' => "Queda detectada na sessão '{$session->name}' com {$confidence}% de confiança",
                'data' => [
                    'session_id' => $session->id,
                    'session_name' => $session->name,
                    'confidence_score' => $confidence,
                    'snapshot_path' => $snapshotPath,
                ],
            ]);

            Log::info('Alert and notification created, broadcasting event', [
                'alert_id' => $alert->id,
                'session_id' => $session->id
            ]);

            // Broadcast em tempo real
            broadcast(new FallDetected($alert));

            Log::info('Broadcast completed', ['alert_id' => $alert->id]);

            // Enviar webhook para n8n (se configurado)
            $this->sendN8nWebhook($alert, $session);



            return response()->json([
                'success' => true,
                'alert_id' => $alert->id,
                'message' => 'Fall detection processed successfully'
            ], 201);

        } catch (\Throwable $e) {
            Log::error('Failed to process fall detection', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    private function saveSnapshot(string $base64Data, int $sessionId): ?string
    {
        try {
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

    public function healthCheck()
    {
        try {
            $response = Http::get(self::PYTHON_SERVICE_URL . '/health');

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

    private function sendN8nWebhook(FallAlert $alert, MonitoringSession $session): void
    {
        try {
            $user = $session->user;
            $n8nWebhookUrl = env('N8N_WEBHOOK_URL', 'http://localhost:5678/webhook-test/queda');

            $payload = [
                'receiver' => $user->email, // Usar o email do usuário da sessão
                'usuario' => [
                    'nome' => $user->name,
                    'email' => $user->email,
                    'telefone' => $user->phone,
                ],
                'queda' => [
                    'data_hora' => $alert->detected_at->format('d/m/Y H:i:s'),
                    'confianca' => number_format($alert->confidence_score, 1) . '%',
                    'local' => $session->name,
                ],
            ];

            Log::info('Sending webhook to n8n', ['alert_id' => $alert->id]);

            $response = Http::timeout(5)->post($n8nWebhookUrl, $payload);

            if ($response->successful()) {
                Log::info('n8n webhook sent successfully', ['alert_id' => $alert->id]);
            } else {
                Log::warning('n8n webhook failed', ['alert_id' => $alert->id, 'status' => $response->status()]);
            }

        } catch (\Exception $e) {
            Log::error('Failed to send n8n webhook', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Simula uma detecção de queda para testes (não requer autenticação)
     */
    public function testFallDetection(Request $request)
    {
        Log::info('Test fall detection triggered', $request->all());

        try {
            $sessionId = $request->input('session_id');

            if (!$sessionId) {
                return response()->json([
                    'success' => false,
                    'error' => 'session_id é obrigatório'
                ], 400);
            }

            $session = MonitoringSession::find($sessionId);
            if (!$session) {
                return response()->json([
                    'success' => false,
                    'error' => 'Sessão não encontrada'
                ], 404);
            }

            // Criar um alerta de teste
            $alert = FallAlert::create([
                'monitoring_session_id' => $session->id,
                'detected_at' => now(),
                'confidence_score' => 98.5,
                'snapshot_path' => null,
                'status' => 'pending',
                'detection_metadata' => [
                    'source' => 'test',
                    'algorithm' => 'manual_test',
                    'timestamp' => now()->toIso8601String()
                ]
            ]);

            $session->update(['last_activity_at' => now()]);

            // Criar notificação
            Notification::create([
                'user_id' => $session->user_id,
                'fall_alert_id' => $alert->id,
                'type' => 'fall_detected',
                'title' => 'Queda Detectada (TESTE)',
                'message' => "Alerta de teste na sessão '{$session->name}' com 98.5% de confiança",
                'data' => [
                    'session_id' => $session->id,
                    'session_name' => $session->name,
                    'confidence_score' => 98.5,
                    'test' => true,
                ],
            ]);

            Log::info('Test alert and notification created, broadcasting event', [
                'alert_id' => $alert->id,
                'session_id' => $session->id
            ]);

            // Broadcast em tempo real
            broadcast(new FallDetected($alert));

            Log::info('Test broadcast completed', ['alert_id' => $alert->id]);

            // Enviar webhook para n8n
            $this->sendN8nWebhook($alert, $session);

            return response()->json([
                'success' => true,
                'alert_id' => $alert->id,
                'message' => 'Queda de teste criada e webhook enviado com sucesso!',
                'webhook_url' => env('N8N_WEBHOOK_URL'),
                'data' => [
                    'session_id' => $session->id,
                    'session_name' => $session->name,
                    'confidence' => 98.5,
                ]
            ], 201);

        } catch (\Throwable $e) {
            Log::error('Failed to process test fall detection', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
