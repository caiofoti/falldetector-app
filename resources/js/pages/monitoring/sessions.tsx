import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Head } from '@inertiajs/react';
import { Plus, Video, AlertTriangle } from 'lucide-react';

interface Session {
    id: number;
    name: string;
    camera_url: string;
    status: 'active' | 'inactive';
    last_alert?: string;
}

export default function Sessions({ sessions }: { sessions: Session[] }) {
    return (
        <AppLayout>
            <Head title="Monitoring Sessions" />

            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Monitoring Sessions</h1>
                    <Button>
                        <Plus className="mr-2" />
                        New Session
                    </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {sessions.map((session) => (
                        <Card key={session.id} className="p-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-medium">{session.name}</h3>
                                    <span className={`px-2 py-1 rounded text-xs ${
                                        session.status === 'active'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-100 text-gray-700'
                                    }`}>
                                        {session.status}
                                    </span>
                                </div>

                                <div className="aspect-video bg-gray-900 rounded flex items-center justify-center">
                                    <Video className="text-gray-600" />
                                </div>

                                {session.last_alert && (
                                    <div className="flex items-center gap-2 text-sm text-orange-600">
                                        <AlertTriangle className="h-4 w-4" />
                                        Last alert: {session.last_alert}
                                    </div>
                                )}

                                <Button variant="outline" className="w-full">
                                    View Live
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
