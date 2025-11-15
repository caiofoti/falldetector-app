<?php

namespace App\Http\Controllers;

use App\Models\MonitoringSession;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MonitoringSessionController extends Controller
{
    public function index()
    {
        $sessions = auth()->user()->monitoringSessions()
            ->withCount('alerts')
            ->latest()
            ->get();

        return Inertia::render('monitoring/sessions', [
            'sessions' => $sessions,
        ]);
    }

    public function show(MonitoringSession $session)
    {
        $this->authorize('view', $session);

        return Inertia::render('monitoring/live', [
            'session' => $session->load('recentAlerts'),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'camera_type' => 'required|in:webcam,ip_camera,rtsp',
            'camera_url' => 'required|string',
            'camera_settings' => 'nullable|array',
        ]);

        $session = auth()->user()->monitoringSessions()->create($validated);

        return redirect()->route('monitoring.show', $session);
    }

    public function destroy(MonitoringSession $session)
    {
        $this->authorize('delete', $session);

        $session->delete();

        return redirect()->route('monitoring.index');
    }
}
