<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MonitoringSession;
use Illuminate\Http\Request;

class MonitoringApiController extends Controller
{
    /**
     * Obter alertas de uma sessão
     */
    public function getAlerts(MonitoringSession $session)
    {
        $this->authorize('view', $session);

        $alerts = $session->alerts()
            ->latest('detected_at')
            ->limit(20)
            ->get()
            ->map(function ($alert) {
                return [
                    'id' => $alert->id,
                    'detected_at' => $alert->detected_at->toIso8601String(),
                    'confidence_score' => $alert->confidence_score,
                    'snapshot_path' => $alert->snapshot_path,
                    'status' => $alert->status,
                    'message' => "Queda detectada com {$alert->confidence_score}% de confiança",
                ];
            });

        return response()->json([
            'success' => true,
            'alerts' => $alerts,
            'count' => $alerts->count()
        ]);
    }

    /**
     * Estatísticas da sessão
     */
    public function getStats(MonitoringSession $session)
    {
        $this->authorize('view', $session);

        $stats = [
            'total_alerts' => $session->alerts()->count(),
            'pending_alerts' => $session->alerts()->where('status', 'pending')->count(),
            'confirmed_alerts' => $session->alerts()->where('status', 'confirmed')->count(),
            'dismissed_alerts' => $session->alerts()->where('status', 'dismissed')->count(),
            'avg_confidence' => $session->alerts()->avg('confidence_score'),
            'last_alert_at' => $session->alerts()->latest('detected_at')->first()?->detected_at,
            'session_duration' => $session->created_at->diffInMinutes(now()),
            'status' => $session->status,
        ];

        return response()->json([
            'success' => true,
            'stats' => $stats
        ]);
    }
}
