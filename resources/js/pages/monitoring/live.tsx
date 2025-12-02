import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Head, router } from '@inertiajs/react';
import { AlertTriangle, Camera, Activity, X, Volume2, VolumeX, Settings, Play, Square, TestTube2 } from 'lucide-react';
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
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 3;

    const initializeStream = useCallback(() => {
        if (imgRef.current && isMonitoring) {
            const timestamp = Date.now();
            imgRef.current.src = `/camera/${session.id}/stream?t=${timestamp}`;

            imgRef.current.onload = () => {
                setStreamError('');
                setIsConnected(true);
                reconnectAttempts.current = 0;
            };

            imgRef.current.onerror = () => {
                setIsConnected(false);
                if (reconnectAttempts.current < maxReconnectAttempts) {
                    reconnectAttempts.current++;
                    setTimeout(initializeStream, 2000);
                } else {
                    setStreamError('Falha ao conectar com o stream. Verifique se o serviço Python está rodando.');
                }
            };
        }
    }, [session.id, isMonitoring]);

    useEffect(() => {
        const checkPythonStatus = async () => {
            try {
                const response = await axios.get(`/camera/${session.id}/status`);
                setPythonStatus(response.data);

                if (response.data.session_id && response.data.is_running) {
                    if (!isMonitoring) {
                        setIsMonitoring(true);
                        setSessionStatus('active');
                    }
                    if (!isConnected && imgRef.current && !imgRef.current.src.includes('/stream')) {
                        initializeStream();
                    }
                }
            } catch (error) {
                console.error('Error checking Python status:', error);
            }
        };

        checkPythonStatus();
        statusCheckInterval.current = setInterval(checkPythonStatus, 3000);

        return () => {
            if (statusCheckInterval.current) {
                clearInterval(statusCheckInterval.current);
            }
        };
    }, [session.id, isMonitoring, isConnected, initializeStream]);

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

    const startMonitoring = async () => {
        try {
            setStreamError('');
            setIsMonitoring(true);

            const response = await axios.post(`/camera/${session.id}/start`);

            if (response.data.success) {
                setIsConnected(false);
                setSessionStatus('active');

                setTimeout(() => {
                    initializeStream();
                }, 2000);
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

    const stopMonitoring = async () => {
        try {
            // Limpar o stream imediatamente para evitar travamento
            if (imgRef.current) {
                // Remove os event listeners primeiro
                imgRef.current.onload = null;
                imgRef.current.onerror = null;

                // Limpa o src para interromper o stream
                imgRef.current.src = '';
                imgRef.current.srcset = '';
            }

            // Atualizar estados locais primeiro
            setIsMonitoring(false);
            setIsConnected(false);
            setSessionStatus('inactive');
            setStreamError('');

            // Chamar o backend para parar o Python service
            await axios.post(`/camera/${session.id}/stop`);

        } catch (error) {
            console.error('Error stopping monitoring:', error);
            // Garantir que os estados sejam atualizados mesmo com erro
            setIsMonitoring(false);
            setIsConnected(false);
            setSessionStatus('inactive');

            if (imgRef.current) {
                imgRef.current.onload = null;
                imgRef.current.onerror = null;
                imgRef.current.src = '';
                imgRef.current.srcset = '';
            }
        }
    };

    useEffect(() => {
        console.log('Setting up WebSocket connection for session:', session.id);

        const channel = window.Echo.private(`monitoring-session.${session.id}`);

        channel
            .listen('.fall.detected', (data: FallAlert) => {
                console.log('Fall detected event received:', data);
                setAlerts(prev => {
                    const newAlerts = [data, ...prev.slice(0, 19)];
                    console.log('Updated alerts:', newAlerts);
                    return newAlerts;
                });

                if (soundEnabled) {
                    const audio = new Audio('/sounds/alert.mp3');
                    audio.play().catch((err) => console.error('Audio play error:', err));
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
                console.log('Session status changed:', data);
                setSessionStatus(data.status);
            });

        channel.subscribed(() => {
            console.log('Successfully subscribed to channel:', `monitoring-session.${session.id}`);
        });

        channel.error((error: any) => {
            console.error('Channel error:', error);
        });

        // Test connection
        console.log('Echo instance:', window.Echo);
        console.log('Channel:', channel);

        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        fetchAlerts();

        return () => {
            console.log('Cleaning up WebSocket connection');
            channel.stopListening('.fall.detected');
            channel.stopListening('.session.status.changed');
            window.Echo.leave(`monitoring-session.${session.id}`);

            if (statusCheckInterval.current) {
                clearInterval(statusCheckInterval.current);
            }

            // Limpar o stream imediatamente
            if (imgRef.current) {
                imgRef.current.onload = null;
                imgRef.current.onerror = null;
                imgRef.current.src = '';
                imgRef.current.srcset = '';
            }

            // Parar o monitoramento ao sair da página
            if (isMonitoring) {
                console.log('Stopping monitoring on component unmount');
                axios.post(`/camera/${session.id}/stop`).catch((err) => {
                    console.error('Error stopping monitoring on unmount:', err);
                });
            }
        };
    }, [session.id, soundEnabled, fetchAlerts, isMonitoring]);

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

    const handleTestFall = async () => {
        try {
            setStreamError('');
            const response = await axios.post('/api/test-fall', {
                session_id: session.id
            });

            if (response.data.success) {
                alert('Teste de queda enviado com sucesso!\n\n' +
                      `Alerta criado: #${response.data.alert_id}\n` +
                      `Broadcast enviado via WebSocket\n` +
                      `Webhook enviado para n8n: ${response.data.webhook_url}\n\n` +
                      'Aguarde alguns segundos para o alerta aparecer na tela.');
            }
        } catch (error: any) {
            console.error('Error testing fall detection:', error);
            setStreamError(error.response?.data?.error || 'Erro ao enviar teste de queda');
        }
    };

    return (
        <AppLayout>
            <Head title={`Ao Vivo - ${session.name}`} />

            <div className="space-y-4 p-4 md:space-y-6 md:p-6">
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
                                    {pythonStatus.fall_detected ? 'Queda Detectada' : 'Monitorando'}
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
                            title="Alternar som de alerta"
                        >
                            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleTestFall}
                            className="shrink-0"
                            title="Testar detecção de queda (envia webhook para n8n)"
                        >
                            <TestTube2 className="h-4 w-4" />
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

                    <div className="space-y-4">
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
                                                <div className="relative">
                                                    <img
                                                        src={alert.snapshot_path}
                                                        alt="Captura da queda"
                                                        className="w-full rounded"
                                                        onError={(e) => {
                                                            console.error('Failed to load snapshot:', alert.snapshot_path);
                                                            e.currentTarget.style.display = 'none';
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </Card>

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
