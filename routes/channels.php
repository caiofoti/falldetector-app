<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('monitoring-session.{sessionId}', function ($user, $sessionId) {
    return $user->monitoringSessions()
        ->where('id', $sessionId)
        ->exists();
});
