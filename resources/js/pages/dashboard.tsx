import AppLayout from '@/layouts/app-layout';
import PWAInstallButton from '@/components/pwa-install-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Head, Link, router } from '@inertiajs/react';
import { Plus, Video, AlertTriangle, Clock, Trash2, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MonitoringSession {
    id: number;
    name: string;
    description?: string;
    camera_type: string;
    status: 'active' | 'inactive' | 'error';
    last_activity_at?: string;
    alerts_count?: number;
}

interface DashboardProps {
    sessions: MonitoringSession[];
}

export default function Dashboard({ sessions }: DashboardProps) {
    const handleDeleteSession = (sessionId: number) => {
        if (confirm('Tem certeza que deseja excluir esta sessão de monitoramento?')) {
            router.delete(`/monitoring/${sessionId}`, {
                preserveScroll: true,
            });
        }
    };

    const activeSessionsCount = sessions.filter(s => s.status === 'active').length;
    const totalAlertsCount = sessions.reduce((sum, s) => sum + (s.alerts_count || 0), 0);

    return (
        <AppLayout>
            <Head title="Painel de Monitoramento" />
            <PWAInstallButton />

            <div className="p-4 space-y-4 md:p-6 md:space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-bold sm:text-2xl md:text-3xl">Painel de Monitoramento</h1>
                        <p className="text-xs text-muted-foreground mt-1 sm:text-sm">
                            Gerencie suas sessões de detecção de quedas
                        </p>
                    </div>
                    <Link href="/monitoring/create" className="w-full sm:w-auto">
                        <Button size="lg" className="w-full sm:w-auto">
                            <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                            <span className="text-sm sm:text-base">Nova Sessão</span>
                        </Button>
                    </Link>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-3 sm:grid-cols-3 md:gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-medium sm:text-sm">Total de Sessões</CardTitle>
                            <Video className="h-3 w-3 text-muted-foreground sm:h-4 sm:w-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold sm:text-2xl">{sessions.length}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-medium sm:text-sm">Monitoramento Ativo</CardTitle>
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold sm:text-2xl">{activeSessionsCount}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-medium sm:text-sm">Total de Alertas</CardTitle>
                            <AlertTriangle className="h-3 w-3 text-orange-600 sm:h-4 sm:w-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold sm:text-2xl">{totalAlertsCount}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sessions List */}
                <div>
                    <h2 className="text-base font-semibold mb-3 sm:text-lg sm:mb-4">Sessões de Monitoramento</h2>

                    {sessions.length === 0 ? (
                        <Card className="p-8 sm:p-12">
                            <div className="text-center space-y-3 sm:space-y-4">
                                <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center sm:w-16 sm:h-16">
                                    <Video className="h-6 w-6 text-muted-foreground sm:h-8 sm:w-8" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-base sm:text-lg">Nenhuma sessão de monitoramento</h3>
                                    <p className="text-xs text-muted-foreground mt-1 sm:text-sm">
                                        Crie sua primeira sessão para começar a detectar quedas
                                    </p>
                                </div>
                                <Link href="/monitoring/create" className="inline-block">
                                    <Button size="lg">
                                        <Plus className="mr-2 h-4 w-4" />
                                        Criar Sessão
                                    </Button>
                                </Link>
                            </div>
                        </Card>
                    ) : (
                        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {sessions.map((session) => (
                                <Card key={session.id} className="hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-2 sm:pb-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="space-y-1 flex-1 min-w-0">
                                                <CardTitle className="text-sm truncate sm:text-base">
                                                    {session.name}
                                                </CardTitle>
                                                {session.description && (
                                                    <CardDescription className="text-xs line-clamp-2">
                                                        {session.description}
                                                    </CardDescription>
                                                )}
                                            </div>
                                            <Badge
                                                variant={
                                                    session.status === 'active' ? 'default' :
                                                        session.status === 'error' ? 'destructive' :
                                                            'secondary'
                                                }
                                                className="ml-2 shrink-0 text-xs"
                                            >
                                                {session.status === 'active' ? 'Ativo' :
                                                    session.status === 'error' ? 'Erro' : 'Inativo'}
                                            </Badge>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="space-y-3 sm:space-y-4">
                                        <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Video className="h-3 w-3 sm:h-4 sm:w-4" />
                                                <span className="capitalize">
                                                    {session.camera_type === 'webcam' ? 'Webcam' :
                                                        session.camera_type === 'ip_camera' ? 'Câmera IP' :
                                                            'Stream RTSP'}
                                                </span>
                                            </div>

                                            {session.alerts_count !== undefined && session.alerts_count > 0 && (
                                                <div className="flex items-center gap-2 text-orange-600">
                                                    <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />
                                                    <span>{session.alerts_count} alerta{session.alerts_count !== 1 ? 's' : ''}</span>
                                                </div>
                                            )}

                                            {session.last_activity_at && (
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                                                    <span className="text-xs">
                                                        {new Date(session.last_activity_at).toLocaleString('pt-BR')}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-2 pt-2">
                                            <Link href={`/monitoring/${session.id}`} className="flex-1">
                                                <Button variant="default" size="sm" className="w-full text-xs sm:text-sm">
                                                    <Eye className="mr-1 h-3 w-3" />
                                                    Ver Ao Vivo
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDeleteSession(session.id)}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
