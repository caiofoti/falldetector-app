<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;

Route::post('/test', function() {
    return response()->json(['status' => 'ok', 'time' => now()], 200);
});

Route::post('/fall-detected', function(Request $request) {
    $logFile = storage_path('logs/fall-detected.log');
    $timestamp = date('Y-m-d H:i:s');

    file_put_contents($logFile, "$timestamp | Request received\n", FILE_APPEND);

    try {
        $sessionId = $request->input('session_id');
        $confidence = $request->input('confidence_score', 95.0);
        $snapshotBase64 = $request->input('snapshot_base64');

        file_put_contents($logFile, "$timestamp | Session: $sessionId, Confidence: $confidence\n", FILE_APPEND);

        $session = \App\Models\MonitoringSession::find($sessionId);
        if (!$session) {
            file_put_contents($logFile, "$timestamp | ERROR: Session not found\n", FILE_APPEND);
            return response()->json(['success' => false, 'error' => 'Session not found'], 404);
        }

        // Salvar snapshot
        $snapshotPath = null;
        if ($snapshotBase64) {
            try {
                $snapshotBase64 = preg_replace('/^data:image\/\w+;base64,/', '', $snapshotBase64);
                $imageData = base64_decode($snapshotBase64);

                $filename = 'fall_' . $sessionId . '_' . time() . '.jpg';
                $path = 'snapshots/' . date('Y/m');
                $fullPath = storage_path('app/public/' . $path);

                if (!file_exists($fullPath)) {
                    mkdir($fullPath, 0755, true);
                }

                file_put_contents($fullPath . '/' . $filename, $imageData);
                $snapshotPath = '/storage/' . $path . '/' . $filename;

                file_put_contents($logFile, "$timestamp | Snapshot saved: $snapshotPath\n", FILE_APPEND);
            } catch (\Exception $e) {
                file_put_contents($logFile, "$timestamp | Snapshot error: {$e->getMessage()}\n", FILE_APPEND);
            }
        }

        // Criar alerta
        $alert = \App\Models\FallAlert::create([
            'monitoring_session_id' => $sessionId,
            'detected_at' => now(),
            'confidence_score' => $confidence,
            'snapshot_path' => $snapshotPath,
            'status' => 'pending',
            'detection_metadata' => ['source' => 'python']
        ]);

        file_put_contents($logFile, "$timestamp | Alert created: ID={$alert->id}\n", FILE_APPEND);

        // Atualizar sessão
        $session->update(['last_activity_at' => now()]);

        // Broadcast - COM FORCE
        try {
            $event = new \App\Events\FallDetected($alert);

            // Log do broadcast
            file_put_contents($logFile, "$timestamp | Broadcasting to: private-monitoring-session.{$sessionId}\n", FILE_APPEND);

            // Broadcast síncrono
            broadcast($event)->toOthers();

            file_put_contents($logFile, "$timestamp | Broadcast sent\n", FILE_APPEND);

            // IMPORTANTE: Também enviar sem toOthers para garantir
            \Illuminate\Support\Facades\Broadcast::channel("private-monitoring-session.{$sessionId}", function() {
                return true;
            });

        } catch (\Exception $e) {
            file_put_contents($logFile, "$timestamp | Broadcast error: {$e->getMessage()}\n", FILE_APPEND);
            file_put_contents($logFile, "$timestamp | Trace: {$e->getTraceAsString()}\n", FILE_APPEND);
        }

        return response()->json(['success' => true, 'alert_id' => $alert->id], 201);

    } catch (\Exception $e) {
        file_put_contents($logFile, "$timestamp | FATAL ERROR: {$e->getMessage()}\n", FILE_APPEND);
        file_put_contents($logFile, "$timestamp | Trace: {$e->getTraceAsString()}\n", FILE_APPEND);

        return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
    }
});

Route::get('/health', function() {
    return response()->json(['status' => 'ok'], 200);
});
