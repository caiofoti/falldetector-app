<?php

namespace App\Events;

use App\Models\MonitoringSession;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SessionStatusChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public MonitoringSession $session
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('monitoring-session.' . $this->session->id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'session.status.changed';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->session->id,
            'status' => $this->session->status,
            'last_activity_at' => $this->session->last_activity_at?->toIso8601String(),
        ];
    }
}
