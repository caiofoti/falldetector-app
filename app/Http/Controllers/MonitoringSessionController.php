<?php

namespace App\Http\Controllers;

use App\Models\MonitoringSession;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MonitoringSessionController extends Controller
{
    use AuthorizesRequests;
    public function index()
    {
        $sessions = auth()->user()->monitoringSessions()
            ->withCount('alerts')
            ->latest()
            ->get();

        return Inertia::render('dashboard', [
            'sessions' => $sessions,
        ]);
    }

    public function create()
    {
        return Inertia::render('monitoring/create');
    }

    public function show(MonitoringSession $session)
    {
        $this->authorize('view', $session);

        $session->load(['alerts' => function ($query) {
            $query->latest()->limit(20);
        }]);

        return Inertia::render('monitoring/live', [
            'session' => $session,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:500',
            'camera_type' => 'required|in:webcam,ip_camera,rtsp',
            'camera_url' => 'required|string|max:500',
        ]);

        $session = auth()->user()->monitoringSessions()->create(array_merge($validated, [
            'status' => 'active',
        ]));

        return redirect()->route('monitoring.show', $session)
            ->with('success', 'Monitoring session created successfully!');
    }

    public function destroy(MonitoringSession $session)
    {
        $this->authorize('delete', $session);

        $session->delete();

        return redirect()->route('dashboard')
            ->with('success', 'Monitoring session deleted successfully.');
    }
}
