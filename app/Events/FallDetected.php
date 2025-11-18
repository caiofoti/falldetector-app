<?php

namespace App\Events;

use App\Models\FallAlert;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class FallDetected implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public FallAlert $alert
    ) {
        Log::info('FallDetected event created', [
            'alert_id' => $alert->id,
            'session_id' => $alert->monitoring_session_id,
            'confidence' => $alert->confidence_score
        ]);
    }

    public function broadcastOn(): array
    {
        $channel = new PrivateChannel('monitoring-session.' . $this->alert->monitoring_session_id);

        Log::info('Broadcasting on channel', [
            'channel' => $channel->name,
            'alert_id' => $this->alert->id
        ]);

        return [$channel];
    }

    public function broadcastAs(): string
    {
        return 'fall.detected';
    }

    public function broadcastWith(): array
    {
        $data = [
            'id' => $this->alert->id,
            'detected_at' => $this->alert->detected_at->toIso8601String(),
            'confidence_score' => $this->alert->confidence_score,
            'snapshot_path' => $this->alert->snapshot_path,
            'status' => $this->alert->status,
            'message' => 'Queda detectada com ' . $this->alert->confidence_score . '% de confiança',
        ];

        Log::info('Broadcasting data', $data);

        return $data;
    }
}
