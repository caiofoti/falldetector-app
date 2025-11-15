<?php

namespace App\Http\Controllers;

use App\Models\FallAlert;
use Illuminate\Http\Request;

class FallAlertController extends Controller
{
    public function acknowledge(FallAlert $alert)
    {
        $this->authorize('acknowledge', $alert);

        $alert->update([
            'status' => 'confirmed',
            'acknowledged_at' => now(),
            'acknowledged_by' => auth()->id(),
        ]);

        return back();
    }
}
