<?php

namespace App\Policies;

use App\Models\MonitoringSession;
use App\Models\User;

class MonitoringSessionPolicy
{
    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, MonitoringSession $session): bool
    {
        return $user->id === $session->user_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, MonitoringSession $session): bool
    {
        return $user->id === $session->user_id;
    }
}
