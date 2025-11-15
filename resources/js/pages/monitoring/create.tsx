import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import InputError from '@/components/input-error';

export default function Create() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        description: '',
        camera_type: 'webcam',
        camera_url: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/monitoring');
    };

    return (
        <AppLayout>
            <Head title="Create Monitoring Session" />

            <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.visit('/dashboard')}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold">New Monitoring Session</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Configure your fall detection camera
                        </p>
                    </div>
                </div>

                {/* Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Session Configuration</CardTitle>
                        <CardDescription>
                            Set up your monitoring session with camera details
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Name */}
                            <div className="space-y-2">
                                <Label htmlFor="name">
                                    Session Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    placeholder="e.g., Living Room Monitor"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    required
                                />
                                <InputError message={errors.name} />
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Input
                                    id="description"
                                    placeholder="Optional description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                />
                                <InputError message={errors.description} />
                            </div>

                            {/* Camera Type */}
                            <div className="space-y-2">
                                <Label htmlFor="camera_type">
                                    Camera Type <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={data.camera_type}
                                    onValueChange={(value) => setData('camera_type', value)}
                                >
                                    <SelectTrigger id="camera_type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="webcam">Webcam</SelectItem>
                                        <SelectItem value="ip_camera">IP Camera</SelectItem>
                                        <SelectItem value="rtsp">RTSP Stream</SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.camera_type} />
                            </div>

                            {/* Camera URL */}
                            <div className="space-y-2">
                                <Label htmlFor="camera_url">
                                    Camera URL/ID <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="camera_url"
                                    placeholder={
                                        data.camera_type === 'webcam' ? '0 (default camera)' :
                                            data.camera_type === 'ip_camera' ? 'http://192.168.1.100:8080/video' :
                                                'rtsp://username:password@192.168.1.100:554/stream'
                                    }
                                    value={data.camera_url}
                                    onChange={(e) => setData('camera_url', e.target.value)}
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    {data.camera_type === 'webcam' && 'Enter 0 for default webcam, 1 for second camera, etc.'}
                                    {data.camera_type === 'ip_camera' && 'Enter the HTTP URL of your IP camera stream'}
                                    {data.camera_type === 'rtsp' && 'Enter the RTSP stream URL with credentials if needed'}
                                </p>
                                <InputError message={errors.camera_url} />
                            </div>

                            {/* Info Box */}
                            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                <h4 className="font-medium text-sm mb-2">How it works</h4>
                                <ul className="text-xs space-y-1 text-muted-foreground">
                                    <li>• The system will continuously monitor the video feed</li>
                                    <li>• AI detects potential falls in real-time</li>
                                    <li>• You'll receive instant notifications when a fall is detected</li>
                                    <li>• All alerts are logged with timestamps and snapshots</li>
                                </ul>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.visit('/dashboard')}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="flex-1"
                                >
                                    Create Session
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
