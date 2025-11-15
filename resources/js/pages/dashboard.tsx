import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Head, Link, router } from '@inertiajs/react';
import { Plus, Video, AlertTriangle, Clock, Play, Pause, Trash2 } from 'lucide-react';
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
        if (confirm('Are you sure you want to delete this monitoring session?')) {
            router.delete(`/monitoring/${sessionId}`, {
                preserveScroll: true,
            });
        }
    };

    const activeSessionsCount = sessions.filter(s => s.status === 'active').length;
    const totalAlertsCount = sessions.reduce((sum, s) => sum + (s.alerts_count || 0), 0);

    return (
        <AppLayout>
            <Head title="Monitoring Dashboard" />

        <div className="p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
        <h1 className="text-2xl md:text-3xl font-bold">Monitoring Dashboard</h1>
    <p className="text-sm text-muted-foreground mt-1">
        Manage your fall detection monitoring sessions
    </p>
    </div>
    <Link href="/monitoring/create">
    <Button size="lg" className="w-full sm:w-auto">
    <Plus className="mr-2 h-5 w-5" />
        New Session
    </Button>
    </Link>
    </div>

    {/* Stats */}
    <div className="grid gap-4 md:grid-cols-3">
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
    <Video className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
    <div className="text-2xl font-bold">{sessions.length}</div>
    </CardContent>
    </Card>

    <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">Active Monitoring</CardTitle>
    <Play className="h-4 w-4 text-green-600" />
    </CardHeader>
    <CardContent>
    <div className="text-2xl font-bold">{activeSessionsCount}</div>
    </CardContent>
    </Card>

    <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
    <AlertTriangle className="h-4 w-4 text-orange-600" />
    </CardHeader>
    <CardContent>
    <div className="text-2xl font-bold">{totalAlertsCount}</div>
        </CardContent>
        </Card>
        </div>

    {/* Sessions List */}
    <div>
        <h2 className="text-lg font-semibold mb-4">Monitoring Sessions</h2>

    {sessions.length === 0 ? (
        <Card className="p-12">
        <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
        <Video className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
        <h3 className="font-semibold text-lg">No monitoring sessions</h3>
    <p className="text-sm text-muted-foreground mt-1">
        Create your first monitoring session to start detecting falls
    </p>
    </div>
    <Link href="/monitoring/create">
    <Button>
        <Plus className="mr-2 h-4 w-4" />
        Create Session
    </Button>
    </Link>
    </div>
    </Card>
    ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session) => (
                    <Card key={session.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1 min-w-0">
                <CardTitle className="text-base truncate">
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
        className="ml-2 shrink-0"
            >
            {session.status}
            </Badge>
            </div>
            </CardHeader>

            <CardContent className="space-y-4">
        {/* Info */}
        <div className="space-y-2 text-sm">
    <div className="flex items-center gap-2 text-muted-foreground">
    <Video className="h-4 w-4" />
    <span className="capitalize">{session.camera_type.replace('_', ' ')}</span>
        </div>

        {session.alerts_count !== undefined && session.alerts_count > 0 && (
            <div className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="h-4 w-4" />
                <span>{session.alerts_count} alert{session.alerts_count !== 1 ? 's' : ''}</span>
        </div>
        )}

        {session.last_activity_at && (
            <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-xs">
                {new Date(session.last_activity_at).toLocaleString()}
                </span>
                </div>
        )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
        <Link href={`/monitoring/${session.id}`} className="flex-1">
    <Button variant="default" size="sm" className="w-full">
    <Play className="mr-1 h-3 w-3" />
        View Live
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
