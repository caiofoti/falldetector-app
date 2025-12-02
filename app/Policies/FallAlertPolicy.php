<?php

namespace App\Policies;

use App\Models\FallAlert;
use App\Models\User;

class FallAlertPolicy
{
    /**
     * Determine whether the user can acknowledge the alert.
     */
    public function acknowledge(User $user, FallAlert $alert): bool
    {
        return $user->id === $alert->monitoringSession->user_id;
    }
}
