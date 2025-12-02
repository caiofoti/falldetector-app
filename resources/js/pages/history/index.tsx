import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { DataTable } from '@/components/data-table/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, AlertTriangle, Bell, Calendar } from 'lucide-react';

interface HistoryProps {
    stats: {
        total_sessions: number;
        total_alerts: number;
        total_notifications: number;
        active_sessions: number;
    };
}

interface MonitoringSession {
    id: number;
    name: string;
    camera_type: string;
    status: { value: string; label: string };
    fall_count: number;
    last_alert: string;
    created_at: string;
    actions: string;
}

interface FallAlert {
    id: number;
    session_name: string;
    detected_at: string;
    confidence_score: string;
    status: { value: string; label: string };
    has_snapshot: boolean;
}

interface Notification {
    id: number;
    type: string;
    title: string;
    message: string;
    created_at: string;
    read_at: string;
    is_read: boolean;
}

export default function History({ stats }: HistoryProps) {
    const [sessions, setSessions] = useState<MonitoringSession[]>([]);
    const [alerts, setAlerts] = useState<FallAlert[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [sessionsRes, alertsRes, notificationsRes] = await Promise.all([
                axios.get('/history/sessions-data'),
                axios.get('/history/alerts-data'),
                axios.get('/history/notifications-data'),
            ]);

            setSessions(sessionsRes.data.data || []);
            setAlerts(alertsRes.data.data || []);
            setNotifications(notificationsRes.data.data || []);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    const sessionColumns: ColumnDef<MonitoringSession>[] = [
        {
            accessorKey: 'name',
            header: 'Nome da Sessão',
        },
        {
            accessorKey: 'camera_type',
            header: 'Tipo',
            cell: ({ row }) => {
                const types: Record<string, string> = {
                    webcam: 'Webcam',
                    ip_camera: 'Câmera IP',
                    rtsp: 'RTSP',
                };
                return types[row.original.camera_type] || row.original.camera_type;
            },
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const isActive = row.original.status.value === 'active';
                return (
                    <Badge variant={isActive ? 'default' : 'secondary'}>
                        {row.original.status.label}
                    </Badge>
                );
            },
        },
        {
            accessorKey: 'fall_count',
            header: 'Quedas',
            cell: ({ row }) => (
                <span className="font-medium">{row.original.fall_count}</span>
            ),
        },
        {
            accessorKey: 'last_alert',
            header: 'Última Queda',
        },
        {
            accessorKey: 'created_at',
            header: 'Criado em',
        },
        {
            id: 'actions',
            header: 'Ações',
            cell: ({ row }) => (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = row.original.actions}
                    className="text-xs"
                >
                    Visualizar
                </Button>
            ),
        },
    ];

    const alertColumns: ColumnDef<FallAlert>[] = [
        {
            accessorKey: 'session_name',
            header: 'Sessão',
        },
        {
            accessorKey: 'detected_at',
            header: 'Data/Hora',
        },
        {
            accessorKey: 'confidence_score',
            header: 'Confiança',
            cell: ({ row }) => (
                <Badge variant="outline">{row.original.confidence_score}</Badge>
            ),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
                    pending: 'default',
                    acknowledged: 'secondary',
                    false_positive: 'destructive',
                };
                return (
                    <Badge variant={variants[row.original.status.value] || 'default'}>
                        {row.original.status.label}
                    </Badge>
                );
            },
        },
        {
            accessorKey: 'has_snapshot',
            header: 'Foto',
            cell: ({ row }) => (
                <span className="text-xs">
                    {row.original.has_snapshot ? '✓' : '-'}
                </span>
            ),
        },
    ];

    const notificationColumns: ColumnDef<Notification>[] = [
        {
            accessorKey: 'type',
            header: 'Tipo',
        },
        {
            accessorKey: 'title',
            header: 'Título',
        },
        {
            accessorKey: 'message',
            header: 'Mensagem',
            cell: ({ row }) => (
                <div className="max-w-md truncate" title={row.original.message}>
                    {row.original.message}
                </div>
            ),
        },
        {
            accessorKey: 'created_at',
            header: 'Data/Hora',
        },
        {
            accessorKey: 'is_read',
            header: 'Lida',
            cell: ({ row }) => (
                <Badge variant={row.original.is_read ? 'secondary' : 'default'}>
                    {row.original.is_read ? 'Sim' : 'Não'}
                </Badge>
            ),
        },
    ];

    return (
        <AppLayout>
            <Head title="Histórico" />

            <div className="p-4 space-y-4 max-w-7xl mx-auto md:p-6 md:space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold sm:text-3xl md:text-4xl">Histórico</h1>
                    <p className="text-sm text-muted-foreground mt-1 sm:text-base">
                        Visualize o histórico completo de sessões, alertas e notificações
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-medium sm:text-sm">
                                Total de Sessões
                            </CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold sm:text-2xl">{stats.total_sessions}</div>
                            <p className="text-xs text-muted-foreground">
                                {stats.active_sessions} ativas
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-medium sm:text-sm">
                                Total de Quedas
                            </CardTitle>
                            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold sm:text-2xl">{stats.total_alerts}</div>
                            <p className="text-xs text-muted-foreground">
                                Detectadas
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-medium sm:text-sm">
                                Notificações
                            </CardTitle>
                            <Bell className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold sm:text-2xl">{stats.total_notifications}</div>
                            <p className="text-xs text-muted-foreground">
                                Enviadas
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-medium sm:text-sm">
                                Período
                            </CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold sm:text-2xl">30d</div>
                            <p className="text-xs text-muted-foreground">
                                Últimos dias
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Tables */}
                <Tabs defaultValue="sessions" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="sessions" className="text-xs sm:text-sm">
                            Sessões
                        </TabsTrigger>
                        <TabsTrigger value="alerts" className="text-xs sm:text-sm">
                            Alertas
                        </TabsTrigger>
                        <TabsTrigger value="notifications" className="text-xs sm:text-sm">
                            Notificações
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="sessions" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base sm:text-lg">Sessões de Monitoramento</CardTitle>
                                <CardDescription className="text-xs sm:text-sm">
                                    Todas as sessões criadas
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    </div>
                                ) : (
                                    <DataTable columns={sessionColumns} data={sessions} />
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="alerts" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base sm:text-lg">Alertas de Quedas</CardTitle>
                                <CardDescription className="text-xs sm:text-sm">
                                    Todas as quedas detectadas
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    </div>
                                ) : (
                                    <DataTable columns={alertColumns} data={alerts} />
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="notifications" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base sm:text-lg">Notificações</CardTitle>
                                <CardDescription className="text-xs sm:text-sm">
                                    Todas as notificações recebidas
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    </div>
                                ) : (
                                    <DataTable columns={notificationColumns} data={notifications} />
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}