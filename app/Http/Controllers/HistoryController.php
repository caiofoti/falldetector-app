<?php

namespace App\Http\Controllers;

use App\Models\FallAlert;
use App\Models\MonitoringSession;
use App\Models\Notification;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Yajra\DataTables\Facades\DataTables;

class HistoryController extends Controller
{
    public function index()
    {
        return Inertia::render('history/index', [
            'stats' => [
                'total_sessions' => auth()->user()->monitoringSessions()->count(),
                'total_alerts' => FallAlert::whereHas('monitoringSession', function ($query) {
                    $query->where('user_id', auth()->id());
                })->count(),
                'total_notifications' => auth()->user()->notifications()->count(),
                'active_sessions' => auth()->user()->monitoringSessions()->where('status', 'active')->count(),
            ]
        ]);
    }

    public function sessions(Request $request)
    {
        $query = auth()->user()->monitoringSessions()->with('fallAlerts');

        return DataTables::of($query)
            ->addColumn('fall_count', function (MonitoringSession $session) {
                return $session->fallAlerts()->count();
            })
            ->addColumn('last_alert', function (MonitoringSession $session) {
                $lastAlert = $session->fallAlerts()->latest()->first();
                return $lastAlert ? $lastAlert->detected_at->format('d/m/Y H:i') : '-';
            })
            ->editColumn('created_at', function (MonitoringSession $session) {
                return $session->created_at->format('d/m/Y H:i');
            })
            ->editColumn('status', function (MonitoringSession $session) {
                return [
                    'value' => $session->status,
                    'label' => $session->status === 'active' ? 'Ativa' : 'Inativa'
                ];
            })
            ->addColumn('actions', function (MonitoringSession $session) {
                return route('monitoring.show', $session);
            })
            ->make(true);
    }

    public function alerts(Request $request)
    {
        $query = FallAlert::whereHas('monitoringSession', function ($query) {
            $query->where('user_id', auth()->id());
        })->with('monitoringSession');

        return DataTables::of($query)
            ->addColumn('session_name', function (FallAlert $alert) {
                return $alert->monitoringSession->name;
            })
            ->editColumn('detected_at', function (FallAlert $alert) {
                return $alert->detected_at->format('d/m/Y H:i:s');
            })
            ->editColumn('confidence_score', function (FallAlert $alert) {
                return number_format($alert->confidence_score, 1) . '%';
            })
            ->editColumn('status', function (FallAlert $alert) {
                $labels = [
                    'pending' => 'Pendente',
                    'acknowledged' => 'Confirmado',
                    'false_positive' => 'Falso Positivo'
                ];
                return [
                    'value' => $alert->status,
                    'label' => $labels[$alert->status] ?? $alert->status
                ];
            })
            ->addColumn('has_snapshot', function (FallAlert $alert) {
                return !empty($alert->snapshot_path);
            })
            ->make(true);
    }

    public function notifications(Request $request)
    {
        $query = auth()->user()->notifications()->latest();

        return DataTables::of($query)
            ->editColumn('created_at', function (Notification $notification) {
                return $notification->created_at->format('d/m/Y H:i:s');
            })
            ->editColumn('read_at', function (Notification $notification) {
                return $notification->read_at ? $notification->read_at->format('d/m/Y H:i:s') : '-';
            })
            ->addColumn('is_read', function (Notification $notification) {
                return !is_null($notification->read_at);
            })
            ->editColumn('type', function (Notification $notification) {
                $labels = [
                    'fall_detected' => 'Queda Detectada'
                ];
                return $labels[$notification->type] ?? $notification->type;
            })
            ->make(true);
    }
}