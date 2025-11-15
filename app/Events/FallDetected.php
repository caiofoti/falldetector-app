<?php

namespace App\Events;

use App\Models\FallAlert;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class FallDetected implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public FallAlert $alert
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('monitoring-session.' . $this->alert->monitoring_session_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'fall.detected';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->alert->id,
            'detected_at' => $this->alert->detected_at->toIso8601String(),
            'confidence_score' => $this->alert->confidence_score,
            'snapshot_path' => $this->alert->snapshot_path,
            'message' => 'Fall detected with ' . $this->alert->confidence_score . '% confidence',
        ];
    }
}
