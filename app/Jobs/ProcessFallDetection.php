<?php

namespace App\Jobs;

use App\Events\FallDetected;
use App\Models\FallAlert;
use App\Models\MonitoringSession;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessFallDetection implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $sessionId,
        public float $confidence,
        public ?string $snapshotBase64 = null
    ) {}

    public function handle(): void
    {
        try {
            $session = MonitoringSession::findOrFail($this->sessionId);

            $snapshotPath = null;
            if ($this->snapshotBase64) {
                $snapshotPath = $this->saveSnapshot($this->snapshotBase64, $session->id);
                Log::info('Snapshot saved', ['path' => $snapshotPath]);
            }

            $alert = FallAlert::create([
                'monitoring_session_id' => $session->id,
                'detected_at' => now(),
                'confidence_score' => $this->confidence,
                'snapshot_path' => $snapshotPath,
                'status' => 'pending',
                'detection_metadata' => [
                    'source' => 'python_pipeline',
                    'algorithm' => 'mediapipe_pose',
                    'timestamp' => now()->toIso8601String()
                ]
            ]);

            $session->update(['last_activity_at' => now()]);

            Log::info('Alert created, broadcasting event', [
                'alert_id' => $alert->id,
                'session_id' => $session->id
            ]);

            broadcast(new FallDetected($alert));

            Log::info('Broadcast completed', ['alert_id' => $alert->id]);

        } catch (\Exception $e) {
            Log::error('Failed to process fall detection', [
                'error' => $e->getMessage(),
                'session_id' => $this->sessionId
            ]);
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
}
