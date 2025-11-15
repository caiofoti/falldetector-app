import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Head, router } from '@inertiajs/react';
import { AlertTriangle, Camera, Activity, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface FallAlert {
    id: number;
    detected_at: string;
    confidence_score: number;
    message: string;
    snapshot_path?: string;
}

interface LiveViewProps {
    session: {
        id: number;
        name: string;
        camera_url: string;
        status: string;
    };
}

export default function LiveView({ session }: LiveViewProps) {
    const [isConnected, setIsConnected] = useState(false);
    const [alerts, setAlerts] = useState<FallAlert[]>([]);
    const [sessionStatus, setSessionStatus] = useState(session.status);

    useEffect(() => {
        const channel = window.Echo.private(`monitoring-session.${session.id}`);

        channel
            .listen('.fall.detected', (data: FallAlert) => {
                setAlerts(prev => [data, ...prev.slice(0, 9)]);

                // Mostrar notificação do navegador
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('⚠️ Fall Detected!', {
                        body: data.message,
                        icon: '/falldetector-icon.png',
                        tag: `fall-${data.id}`,
                    });
                }
            })
            .listen('.session.status.changed', (data: { status: string }) => {
                setSessionStatus(data.status);
            });

        channel.subscribed(() => {
            setIsConnected(true);
        });

        channel.error(() => {
            setIsConnected(false);
        });

        // Solicitar permissão para notificações
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        return () => {
            channel.stopListening('.fall.detected');
            channel.stopListening('.session.status.changed');
            window.Echo.leave(`monitoring-session.${session.id}`);
        };
    }, [session.id]);

    const handleStopMonitoring = () => {
        router.delete(`/monitoring/${session.id}`);
    };

    const handleAcknowledgeAlert = (alertId: number) => {
        router.post(`/monitoring/alerts/${alertId}/acknowledge`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                setAlerts(prev => prev.filter(a => a.id !== alertId));
            },
        });
    };

    return (
        <AppLayout>
            <Head title={`Live - ${session.name}`} />

            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">{session.name}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <div className={`h-2 w-2 rounded-full animate-pulse ${
                                isConnected ? 'bg-green-500' : 'bg-red-500'
                            }`} />
                            <span className="text-sm text-muted-foreground">
                                {isConnected ? 'Live' : 'Connecting...'}
                            </span>
                            <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                                sessionStatus === 'active'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-700'
                            }`}>
                                {sessionStatus}
                            </span>
                        </div>
                    </div>
                    <Button variant="destructive" onClick={handleStopMonitoring}>
                        Stop Monitoring
                    </Button>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <Card className="p-0 overflow-hidden">
                            <div className="aspect-video bg-gray-900 relative">
                                <img
                                    src={session.camera_url}
                                    alt="Live feed"
                                    className="w-full h-full object-cover"
                                />
                                {!isConnected && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                        <div className="text-center text-white">
                                            <Camera className="h-16 w-16 mx-auto mb-2" />
                                            <p>Connecting to camera...</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>

                    <div className="space-y-4">
                        <Card className="p-4">
                            <h3 className="font-medium mb-4">Detection Status</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <Activity className={`h-5 w-5 ${
                                        sessionStatus === 'active' ? 'text-green-500' : 'text-gray-400'
                                    }`} />
                                    <span className="text-sm">
                                        AI Model: {sessionStatus === 'active' ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Camera className={`h-5 w-5 ${
                                        isConnected ? 'text-green-500' : 'text-red-500'
                                    }`} />
                                    <span className="text-sm">
                                        Camera: {isConnected ? 'Online' : 'Offline'}
                                    </span>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-4">
                            <h3 className="font-medium mb-4 flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-orange-500" />
                                Recent Alerts ({alerts.length})
                            </h3>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {alerts.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No alerts detected
                                    </p>
                                ) : (
                                    alerts.map((alert) => (
                                        <div
                                            key={alert.id}
                                            className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg space-y-2"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium">
                                                        Fall Detected
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(alert.detected_at).toLocaleString()}
                                                    </p>
                                                    <p className="text-xs mt-1">
                                                        Confidence: {alert.confidence_score}%
                                                    </p>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleAcknowledgeAlert(alert.id)}
                                                    className="h-6 w-6 p-0"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            {alert.snapshot_path && (
                                                <img
                                                    src={alert.snapshot_path}
                                                    alt="Fall snapshot"
                                                    className="w-full rounded"
                                                />
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
