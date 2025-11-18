<?php

namespace App\Http\Controllers;

use App\Events\FallDetected;
use App\Models\FallAlert;
use App\Models\MonitoringSession;
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
        file_put_contents(storage_path('logs/webhook-debug.log'),
            date('Y-m-d H:i:s') . ' - Webhook received: ' . json_encode($request->all()) . PHP_EOL,
            FILE_APPEND
        );

        try {
            $sessionId = $request->input('session_id');
            $confidence = $request->input('confidence_score', 95.0);
            $snapshotBase64 = $request->input('snapshot');

            if (!$sessionId) {
                return response()->json(['success' => false, 'error' => 'No session_id'], 400);
            }

            $session = MonitoringSession::find($sessionId);
            if (!$session) {
                return response()->json(['success' => false, 'error' => 'Session not found'], 404);
            }

            // Despachar o job para processar em background
            ProcessFallDetection::dispatch($sessionId, $confidence, $snapshotBase64);

            file_put_contents(storage_path('logs/webhook-debug.log'),
                date('Y-m-d H:i:s') . ' - Job dispatched for session: ' . $sessionId . PHP_EOL,
                FILE_APPEND
            );

            return response()->json([
                'success' => true,
                'message' => 'Fall detection queued for processing'
            ], 202);

        } catch (\Throwable $e) {
            file_put_contents(storage_path('logs/webhook-debug.log'),
                date('Y-m-d H:i:s') . ' - ERROR: ' . $e->getMessage() . PHP_EOL,
                FILE_APPEND
            );

            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
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
}
