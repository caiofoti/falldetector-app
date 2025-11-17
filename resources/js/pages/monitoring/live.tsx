import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Head, router } from '@inertiajs/react';
import { AlertTriangle, Camera, Activity, X, Volume2, VolumeX, Settings } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { Badge } from '@/components/ui/badge';

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
        camera_type: string;
        status: string;
    };
}

export default function LiveView({ session }: LiveViewProps) {
    const [isConnected, setIsConnected] = useState(false);
    const [alerts, setAlerts] = useState<FallAlert[]>([]);
    const [sessionStatus, setSessionStatus] = useState(session.status);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Inicializar câmera automaticamente
    useEffect(() => {
        const initCamera = async () => {
            if (session.camera_type === 'webcam') {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: { deviceId: session.camera_url || undefined },
                        audio: false
                    });
                    setCameraStream(stream);
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                    setIsConnected(true);
                } catch (error) {
                    console.error('Erro ao acessar câmera:', error);
                    setIsConnected(false);
                }
            } else {
                setIsConnected(true);
            }
        };

        initCamera();

        return () => {
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [session.camera_type, session.camera_url]);

    // WebSocket para alertas em tempo real
    useEffect(() => {
        const channel = window.Echo.private(`monitoring-session.${session.id}`);

        channel
            .listen('.fall.detected', (data: FallAlert) => {
                setAlerts(prev => [data, ...prev.slice(0, 19)]);

                if (soundEnabled) {
                    const audio = new Audio('/sounds/alert.mp3');
                    audio.play().catch(() => {});
                }

                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('Queda Detectada!', {
                        body: data.message,
                        icon: '/falldetector-icon.png',
                        tag: `fall-${data.id}`,
                    });
                }
            })
            .listen('.session.status.changed', (data: { status: string }) => {
                setSessionStatus(data.status);
            });

        channel.subscribed(() => setIsConnected(true));
        channel.error(() => setIsConnected(false));

        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        return () => {
            channel.stopListening('.fall.detected');
            channel.stopListening('.session.status.changed');
            window.Echo.leave(`monitoring-session.${session.id}`);
        };
    }, [session.id, soundEnabled]);

    const handleStopMonitoring = () => {
        if (confirm('Tem certeza que deseja parar o monitoramento?')) {
            router.delete(`/monitoring/${session.id}`);
        }
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
            <Head title={`Ao Vivo - ${session.name}`} />

            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold">{session.name}</h1>
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <div
                                    className={`h-2 w-2 rounded-full ${
                                        isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                                    }`}
                                />
                                <span className="text-sm text-muted-foreground">
                                    {isConnected ? 'Ao Vivo' : 'Conectando...'}
                                </span>
                            </div>
                            <Badge variant={sessionStatus === 'active' ? 'default' : 'secondary'}>
                                {sessionStatus === 'active' ? 'Ativo' : 'Inativo'}
                            </Badge>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setSoundEnabled(!soundEnabled)}
                        >
                            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                        </Button>
                        <Button variant="destructive" onClick={handleStopMonitoring}>
                            Parar Monitoramento
                        </Button>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <Card className="overflow-hidden p-0">
                            <div className="relative aspect-video bg-gray-900">
                                {session.camera_type === 'webcam' ? (
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <img
                                        src={`/camera/${session.id}/stream`}
                                        alt="Feed ao vivo"
                                        className="h-full w-full object-cover"
                                        onLoad={() => setIsConnected(true)}
                                        onError={() => setIsConnected(false)}
                                    />
                                )}
                                {!isConnected && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                        <div className="text-center text-white">
                                            <Camera className="mx-auto mb-2 h-16 w-16" />
                                            <p>Conectando à câmera...</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>

                    <div className="space-y-4">
                        <Card className="p-4">
                            <h3 className="mb-4 font-medium flex items-center gap-2">
                                <Settings className="h-4 w-4" />
                                Status de Detecção
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <Activity
                                        className={`h-5 w-5 ${
                                            sessionStatus === 'active'
                                                ? 'text-green-500'
                                                : 'text-gray-400'
                                        }`}
                                    />
                                    <span className="text-sm">
                                        Modelo de IA: {sessionStatus === 'active' ? 'Ativo' : 'Inativo'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Camera
                                        className={`h-5 w-5 ${
                                            isConnected ? 'text-green-500' : 'text-red-500'
                                        }`}
                                    />
                                    <span className="text-sm">
                                        Câmera: {isConnected ? 'Online' : 'Offline'}
                                    </span>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-4">
                            <h3 className="mb-4 flex items-center gap-2 font-medium">
                                <AlertTriangle className="h-5 w-5 text-orange-500" />
                                Alertas Recentes ({alerts.length})
                            </h3>
                            <div className="max-h-[500px] space-y-2 overflow-y-auto">
                                {alerts.length === 0 ? (
                                    <p className="py-8 text-center text-sm text-muted-foreground">
                                        Nenhum alerta detectado
                                    </p>
                                ) : (
                                    alerts.map((alert) => (
                                        <div
                                            key={alert.id}
                                            className="space-y-2 rounded-lg bg-orange-50 dark:bg-orange-950 p-3 border border-orange-200 dark:border-orange-800"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium">Queda Detectada</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(alert.detected_at).toLocaleString('pt-BR')}
                                                    </p>
                                                    <p className="mt-1 text-xs">
                                                        Confiança: {alert.confidence_score}%
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
                                                    alt="Captura da queda"
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
