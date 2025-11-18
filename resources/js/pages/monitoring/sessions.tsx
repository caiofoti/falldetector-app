import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Head, Link, router } from '@inertiajs/react';
import { Plus, Video, AlertTriangle, Clock, Trash2, Eye, Play } from 'lucide-react';
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

interface SessionsProps {
    sessions: MonitoringSession[];
}

export default function Sessions({ sessions }: SessionsProps) {
    const handleDeleteSession = (sessionId: number) => {
        if (confirm('Tem certeza que deseja excluir esta sessão de monitoramento?')) {
            router.delete(`/monitoring/${sessionId}`, {
                preserveScroll: true,
            });
        }
    };

    return (
        <AppLayout>
            <Head title="Todas as Sessões" />

            <div className="p-4 space-y-4 md:p-6 md:space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-bold sm:text-2xl md:text-3xl">Todas as Sessões</h1>
                        <p className="text-xs text-muted-foreground mt-1 sm:text-sm">
                            Gerencie todas as suas sessões de monitoramento
                        </p>
                    </div>
                    <Link href="/monitoring/create" className="w-full sm:w-auto">
                        <Button size="lg" className="w-full sm:w-auto">
                            <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                            <span className="text-sm sm:text-base">Nova Sessão</span>
                        </Button>
                    </Link>
                </div>

                {sessions.length === 0 ? (
                    <Card className="p-8 sm:p-12">
                        <div className="text-center space-y-3 sm:space-y-4">
                            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center sm:w-16 sm:h-16">
                                <Video className="h-6 w-6 text-muted-foreground sm:h-8 sm:w-8" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-base sm:text-lg">Nenhuma sessão encontrada</h3>
                                <p className="text-xs text-muted-foreground mt-1 sm:text-sm">
                                    Crie sua primeira sessão para começar
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
                                                {session.status === 'active' ? (
                                                    <>
                                                        <Eye className="mr-1 h-3 w-3" />
                                                        Ver Ao Vivo
                                                    </>
                                                ) : (
                                                    <>
                                                        <Play className="mr-1 h-3 w-3" />
                                                        Iniciar
                                                    </>
                                                )}
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
        </AppLayout>
    );
}
