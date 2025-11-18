import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Head, router } from '@inertiajs/react';
import { AlertTriangle, Camera, Activity, X, Volume2, VolumeX, Settings, Play, Square } from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';

interface FallAlert {
    id: number;
    detected_at: string;
    confidence_score: number;
    message: string;
    snapshot_path?: string;
    status: string;
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
    const [isMonitoring, setIsMonitoring] = useState(session.status === 'active');
    const [alerts, setAlerts] = useState<FallAlert[]>([]);
    const [sessionStatus, setSessionStatus] = useState(session.status);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [pythonStatus, setPythonStatus] = useState<{
        fall_detected: boolean;
        session_id?: number;
        is_running?: boolean;
        timestamp?: number;
        error?: string;
    } | null>(null);
    const [streamError, setStreamError] = useState<string>('');
    const imgRef = useRef<HTMLImageElement>(null);
    const statusCheckInterval = useRef<number | null>(null);
    const streamCheckInterval = useRef<number | null>(null);

    // Inicializar stream se monitoramento já estiver ativo
    useEffect(() => {
        if (session.status === 'active' && imgRef.current) {
            // Aguardar um pouco para garantir que o componente foi montado
            setTimeout(() => {
                if (imgRef.current) {
                    imgRef.current.src = `/camera/${session.id}/stream?t=${Date.now()}`;
                }
            }, 500);
        }
    }, []);

    // Verificar status inicial e do Python a cada 2 segundos
    useEffect(() => {
        const checkPythonStatus = async () => {
            try {
                const response = await axios.get(`/camera/${session.id}/status`);
                setPythonStatus(response.data);

                // Se o Python tem uma sessão ativa, sincronizar o estado
                if (response.data.session_id && response.data.is_running) {
                    if (!isMonitoring) {
                        setIsMonitoring(true);
                        setIsConnected(true);
                        setSessionStatus('active');

                        // Iniciar stream se não estiver rodando
                        if (imgRef.current && !imgRef.current.src.includes('/stream')) {
                            imgRef.current.src = `/camera/${session.id}/stream?t=${Date.now()}`;
                        }
                    }
                } else if (isMonitoring && !response.data.is_running) {
                    // Python parou, sincronizar estado
                    setIsMonitoring(false);
                    setIsConnected(false);
                    setSessionStatus('inactive');
                }

                if (response.data.fall_detected && !alerts.find(a => a.status === 'pending')) {
                    // Nova queda detectada - será atualizada via WebSocket
                }
            } catch (error) {
                console.error('Error checking Python status:', error);
                setPythonStatus(null);

                // Se não conseguir conectar com o Python, assumir que não está rodando
                if (isMonitoring) {
                    setIsMonitoring(false);
                    setIsConnected(false);
                }
            }
        };

        // Verificação inicial imediata
        checkPythonStatus();

        // Configurar intervalo de verificação
        statusCheckInterval.current = setInterval(checkPythonStatus, 2000);

        return () => {
            if (statusCheckInterval.current) {
                clearInterval(statusCheckInterval.current);
            }
        };
    }, [session.id]);

    // Buscar alertas existentes
    const fetchAlerts = useCallback(async () => {
        try {
            const response = await axios.get(`/api/monitoring/${session.id}/alerts`);
            if (response.data && response.data.alerts) {
                setAlerts(response.data.alerts);
            }
        } catch (error) {
            console.error('Error fetching alerts:', error);
        }
    }, [session.id]);

    // Iniciar monitoramento
    const startMonitoring = async () => {
        try {
            setStreamError('');
            setIsMonitoring(true);

            const response = await axios.post(`/camera/${session.id}/start`);

            if (response.data.success) {
                setIsConnected(true);
                setSessionStatus('active');

                // Aguardar um pouco para o Python inicializar completamente
                setTimeout(() => {
                    if (imgRef.current) {
                        imgRef.current.src = `/camera/${session.id}/stream?t=${Date.now()}`;

                        // Verificar se o stream está funcionando
                        const checkStream = () => {
                            if (imgRef.current) {
                                imgRef.current.onerror = () => {
                                    setStreamError('Falha ao carregar stream de vídeo. Verifique se o serviço Python está rodando.');
                                    setIsConnected(false);
                                };

                                imgRef.current.onload = () => {
                                    setStreamError('');
                                    setIsConnected(true);
                                };
                            }
                        };

                        checkStream();
                    }
                }, 1000);
            } else {
                setStreamError(response.data.message || 'Falha ao iniciar monitoramento');
                setIsMonitoring(false);
            }
        } catch (error: any) {
            console.error('Error starting monitoring:', error);
            setStreamError(error.response?.data?.message || 'Erro ao conectar com serviço Python');
            setIsMonitoring(false);
        }
    };

    // Parar monitoramento
    const stopMonitoring = async () => {
        try {
            await axios.post(`/camera/${session.id}/stop`);
            setIsMonitoring(false);
            setIsConnected(false);
            setSessionStatus('inactive');
            setStreamError('');

            if (imgRef.current) {
                imgRef.current.src = '';
                imgRef.current.onload = null;
                imgRef.current.onerror = null;
            }

            // Limpar intervalos
            if (streamCheckInterval.current) {
                clearInterval(streamCheckInterval.current);
                streamCheckInterval.current = null;
            }
        } catch (error) {
            console.error('Error stopping monitoring:', error);
            // Mesmo com erro, atualizar estado local
            setIsMonitoring(false);
            setIsConnected(false);
            setSessionStatus('inactive');
        }
    };

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
                        body: data.message || `Queda detectada com ${data.confidence_score}% de confiança`,
                        icon: '/images/icons/icon-192x192.png',
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

        // Buscar alertas existentes
        fetchAlerts();

        return () => {
            channel.stopListening('.fall.detected');
            channel.stopListening('.session.status.changed');
            window.Echo.leave(`monitoring-session.${session.id}`);

            // Limpar todos os intervalos ao sair da página
            if (statusCheckInterval.current) {
                clearInterval(statusCheckInterval.current);
            }
            if (streamCheckInterval.current) {
                clearInterval(streamCheckInterval.current);
            }
        };
    }, [session.id, soundEnabled, fetchAlerts]);

    const handleStopSession = () => {
        if (confirm('Tem certeza que deseja parar e excluir esta sessão?')) {
            stopMonitoring();
            router.delete(`/monitoring/${session.id}`);
        }
    };

    const handleAcknowledgeAlert = async (alertId: number) => {
        try {
            await axios.post(`/monitoring/alerts/${alertId}/acknowledge`);
            setAlerts(prev => prev.filter(a => a.id !== alertId));
        } catch (error) {
            console.error('Error acknowledging alert:', error);
        }
    };

    return (
        <AppLayout>
            <Head title={`Ao Vivo - ${session.name}`} />

            <div className="space-y-4 p-4 md:space-y-6 md:p-6">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-xl font-semibold truncate sm:text-2xl">{session.name}</h1>
                        <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-3">
                            <div className="flex items-center gap-2">
                                <div
                                    className={`h-2 w-2 rounded-full ${
                                        isMonitoring && isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                                    }`}
                                />
                                <span className="text-xs text-muted-foreground sm:text-sm">
                                    {isMonitoring ? 'Monitorando' : 'Parado'}
                                </span>
                            </div>
                            <Badge variant={sessionStatus === 'active' ? 'default' : 'secondary'} className="text-xs">
                                {sessionStatus === 'active' ? 'Ativo' : 'Inativo'}
                            </Badge>
                            {pythonStatus && (
                                <Badge
                                    variant={pythonStatus.fall_detected ? 'destructive' : 'outline'}
                                    className="text-xs"
                                >
                                    {pythonStatus.fall_detected ? '⚠️ Queda Detectada' : '✓ Monitorando'}
                                </Badge>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setSoundEnabled(!soundEnabled)}
                            className="shrink-0"
                        >
                            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                        </Button>
                        {!isMonitoring ? (
                            <Button onClick={startMonitoring} className="gap-2">
                                <Play className="h-4 w-4" />
                                <span className="hidden sm:inline">Iniciar</span>
                            </Button>
                        ) : (
                            <Button onClick={stopMonitoring} variant="outline" className="gap-2">
                                <Square className="h-4 w-4" />
                                <span className="hidden sm:inline">Parar</span>
                            </Button>
                        )}
                        <Button variant="destructive" onClick={handleStopSession} className="hidden sm:flex">
                            Encerrar Sessão
                        </Button>
                    </div>
                </div>

                {/* Error Message */}
                {streamError && (
                    <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3 sm:p-4">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0 sm:h-5 sm:w-5" />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-red-600 sm:text-base">Erro de Conexão</p>
                                <p className="text-xs text-red-600/80 mt-1 sm:text-sm">{streamError}</p>
                                <p className="text-xs text-red-600/60 mt-2">
                                    Verifique se o serviço Python está rodando em http://localhost:8080
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid gap-4 lg:grid-cols-3 md:gap-6">
                    {/* Video Stream */}
                    <div className="lg:col-span-2">
                        <Card className="overflow-hidden p-0">
                            <div className="relative aspect-video bg-gray-900">
                    {isMonitoring ? (
                        <>
                            <img
                                ref={imgRef}
                                alt="Feed ao vivo"
                                className="h-full w-full object-contain"
                                style={{ display: isConnected ? 'block' : 'none' }}
                            />
                            {!isConnected && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                    <div className="text-center text-white p-4">
                                        <Camera className="mx-auto mb-2 h-12 w-12 sm:h-16 sm:w-16 animate-pulse" />
                                        <p className="text-sm sm:text-base">
                                            {streamError ? 'Erro de conexão' : 'Conectando ao stream...'}
                                        </p>
                                        {streamError && (
                                            <p className="text-xs text-red-300 mt-2">{streamError}</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-white">
                                        <div className="text-center p-4">
                                            <Camera className="mx-auto mb-3 h-12 w-12 sm:h-16 sm:w-16" />
                                            <p className="text-sm font-medium mb-2 sm:text-base">Monitoramento Parado</p>
                                            <p className="text-xs text-gray-400 sm:text-sm">
                                                Clique em "Iniciar" para começar a detecção
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        {/* Status Card */}
                        <Card className="p-3 sm:p-4">
                            <h3 className="mb-3 font-medium flex items-center gap-2 text-sm sm:text-base sm:mb-4">
                                <Settings className="h-4 w-4" />
                                Status de Detecção
                            </h3>
                            <div className="space-y-2 sm:space-y-3">
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <Activity
                                        className={`h-4 w-4 shrink-0 sm:h-5 sm:w-5 ${
                                            isMonitoring ? 'text-green-500' : 'text-gray-400'
                                        }`}
                                    />
                                    <span className="text-xs sm:text-sm">
                                        Pipeline: {isMonitoring ? 'Ativa' : 'Inativa'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <Camera
                                        className={`h-4 w-4 shrink-0 sm:h-5 sm:w-5 ${
                                            isConnected ? 'text-green-500' : 'text-gray-400'
                                        }`}
                                    />
                                    <span className="text-xs sm:text-sm">
                                        Stream: {isConnected ? 'Online' : 'Offline'}
                                    </span>
                                </div>
                                {pythonStatus && (
                                    <div className="pt-2 border-t text-xs sm:text-sm">
                                        <div className="text-muted-foreground">
                                            Session ID: {pythonStatus.session_id}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Alerts Card */}
                        <Card className="p-3 sm:p-4">
                            <h3 className="mb-3 flex items-center gap-2 font-medium text-sm sm:text-base sm:mb-4">
                                <AlertTriangle className="h-4 w-4 text-orange-500 sm:h-5 sm:w-5" />
                                Alertas Recentes ({alerts.length})
                            </h3>
                            <div className="max-h-[400px] space-y-2 overflow-y-auto sm:max-h-[500px]">
                                {alerts.length === 0 ? (
                                    <p className="py-6 text-center text-xs text-muted-foreground sm:py-8 sm:text-sm">
                                        Nenhum alerta detectado
                                    </p>
                                ) : (
                                    alerts.map((alert) => (
                                        <div
                                            key={alert.id}
                                            className="space-y-2 rounded-lg bg-orange-50 dark:bg-orange-950 p-2.5 border border-orange-200 dark:border-orange-800 sm:p-3"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium sm:text-sm">Queda Detectada</p>
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
                                                    className="h-6 w-6 p-0 shrink-0"
                                                >
                                                    <X className="h-3 w-3 sm:h-4 sm:w-4" />
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

                        {/* Mobile Delete Button */}
                        <Button
                            variant="destructive"
                            onClick={handleStopSession}
                            className="w-full sm:hidden"
                        >
                            Encerrar Sessão
                        </Button>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
