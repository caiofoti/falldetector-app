import AppLayout from '@/layouts/app-layout';
import { Head, router, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

import {
    Card, CardHeader, CardTitle, CardDescription, CardContent
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import InputError from '@/components/input-error';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from '@/components/ui/select';
import { Tooltip, TooltipTrigger, TooltipProvider, TooltipContent } from '@/components/ui/tooltip';

import { ArrowLeft, Camera, Info } from 'lucide-react';

export default function CreateMonitoring() {

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [previewError, setPreviewError] = useState<string>('');
    const [previewEnabled, setPreviewEnabled] = useState(true);

    const { data, setData, post, processing, errors } = useForm({
        name: '',
        description: '',
        camera_type: 'webcam',
        camera_url: '0',
    });

    const stopPreview = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    useEffect(() => {
        const getDevices = async () => {
            try {
                if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
                    return;
                }
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(device => device.kind === 'videoinput');
                setCameraDevices(videoDevices);
            } catch (error) {
                console.error('Erro ao listar câmeras:', error);
            }
        };

        getDevices();
    }, []);

    useEffect(() => {
        const startPreview = async () => {
            if (data.camera_type !== 'webcam' || !previewEnabled) {
                stopPreview();
                return;
            }

            try {
                setPreviewError('');
                const constraints: MediaStreamConstraints = {
                    video: {
                        deviceId: data.camera_url !== '0' ? { exact: data.camera_url } : undefined,
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    },
                    audio: false
                };

                if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
                    throw new Error('API de mídia não suportada neste navegador/dispositivo.');
                }

                const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
                setStream(mediaStream);

                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch (error: unknown) {
                const err = error as { message?: string };
                setPreviewError(err?.message || 'Erro ao acessar câmera');
                console.error('Erro ao iniciar preview:', error);
            }
        };

        startPreview();

        return () => {
            stopPreview();
        };
    }, [data.camera_type, data.camera_url, previewEnabled]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        stopPreview();
        post('/monitoring');
    };

    const getCameraPlaceholder = () => {
        switch (data.camera_type) {
            case 'webcam':
                return 'Selecione uma câmera';
            case 'ip_camera':
                return 'http://192.168.1.100:8080/video';
            case 'rtsp':
                return 'rtsp://usuario:senha@192.168.1.100:554/stream';
            default:
                return '';
        }
    };

    const getCameraHelpText = () => {
        switch (data.camera_type) {
            case 'webcam':
                return 'Selecione a webcam que deseja usar';
            case 'ip_camera':
                return 'Digite a URL HTTP do stream da sua câmera IP';
            case 'rtsp':
                return 'Digite a URL do stream RTSP com credenciais se necessário';
            default:
                return '';
        }
    };

    return (
        <AppLayout>
            <Head title="Nova Sessão de Monitoramento" />

            <div className="flex h-full flex-col">
                <div className="flex items-center gap-3 px-4 py-4 border-b md:px-6 lg:px-8">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.visit('/dashboard')}
                        className="shrink-0"
                    >
                        <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-xl font-bold truncate sm:text-2xl">Nova Sessão</h1>
                        <p className="text-xs text-muted-foreground mt-0.5 sm:text-sm">
                            Configure sua câmera de detecção
                        </p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="container max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
                        <div className="grid gap-4 lg:grid-cols-2 lg:gap-6 xl:gap-8">

                            <Card className="lg:sticky lg:top-4 lg:self-start order-2 lg:order-1">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base sm:text-lg">Preview da Câmera</CardTitle>
                                    <CardDescription className="text-xs sm:text-sm">
                                        Visualize o que a câmera está captando
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pb-4">
                            <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">

                                {data.camera_type === 'webcam' ? (
                                    <>
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            className="w-full h-full object-cover"
                                            style={{ display: stream && previewEnabled ? 'block' : 'none' }}
                                        />

                                        {previewError && previewEnabled && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4">
                                                <div className="text-center text-white space-y-3">
                                                    <Camera className="mx-auto h-8 w-8 sm:h-12 sm:w-12" />
                                                    <p className="text-xs sm:text-sm">{previewError}</p>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setPreviewEnabled(false)}
                                                        className="text-xs"
                                                    >
                                                        Fechar Preview
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {!previewEnabled && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                                                <div className="text-center text-white space-y-3 p-4">
                                                    <Camera className="mx-auto h-8 w-8 sm:h-12 sm:w-12" />
                                                    <p className="text-xs sm:text-sm">Preview desativado</p>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => setPreviewEnabled(true)}
                                                        className="text-xs"
                                                    >
                                                        Ativar Preview
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {previewEnabled && !stream && !previewError && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                                                <div className="text-center text-white">
                                                    <Camera className="mx-auto mb-2 h-8 w-8 sm:h-12 sm:w-12 animate-pulse" />
                                                    <p className="text-xs sm:text-sm">Carregando câmera...</p>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-white">
                                        <div className="text-center p-4">
                                            <Camera className="mx-auto mb-2 h-8 w-8 sm:h-12 sm:w-12" />
                                            <p className="text-xs sm:text-sm">Preview não disponível</p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                Configure a URL e salve para iniciar
                                            </p>
                                        </div>
                                    </div>
                                )}

                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="order-1 lg:order-2">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base sm:text-lg">Configuração</CardTitle>
                                    <CardDescription className="text-xs sm:text-sm">
                                        Preencha os dados da sessão
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="pb-4">
                            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                                <TooltipProvider>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor="name" className="text-xs sm:text-sm">
                                                Nome da Sessão <span className="text-red-500">*</span>
                                            </Label>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Info className="h-3 w-3 text-muted-foreground cursor-help sm:h-4 sm:w-4" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="max-w-xs text-xs">Escolha um nome descritivo</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>

                                        <Input
                                            id="name"
                                            placeholder="ex: Monitor da Sala"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            required
                                            className="text-sm"
                                        />
                                        <InputError message={errors.name} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="description" className="text-xs sm:text-sm">Descrição</Label>
                                        <Textarea
                                            id="description"
                                            placeholder="Descrição opcional"
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            rows={2}
                                            className="text-sm resize-none"
                                        />
                                        <InputError message={errors.description} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="camera_type" className="text-xs sm:text-sm">
                                            Tipo de Câmera <span className="text-red-500">*</span>
                                        </Label>
                                        <Select
                                            value={data.camera_type}
                                            onValueChange={(value) => {
                                                setData('camera_type', value);
                                                setData('camera_url', value === 'webcam' ? '0' : '');
                                            }}
                                        >
                                            <SelectTrigger id="camera_type" className="text-sm">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="webcam">Webcam do Computador</SelectItem>
                                                <SelectItem value="ip_camera">Câmera IP</SelectItem>
                                                <SelectItem value="rtsp">Stream RTSP</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.camera_type} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="camera_url" className="text-xs sm:text-sm">
                                            {data.camera_type === 'webcam' ? 'Câmera' : 'URL/ID da Câmera'} <span className="text-red-500">*</span>
                                        </Label>
                                        {data.camera_type === 'webcam' ? (
                                            <Select
                                                value={data.camera_url}
                                                onValueChange={(value) => setData('camera_url', value)}
                                            >
                                                <SelectTrigger className="text-sm">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="0">Câmera Padrão</SelectItem>
                                                    {cameraDevices.map((device, index) => (
                                                        <SelectItem key={device.deviceId} value={device.deviceId}>
                                                            {device.label || `Câmera ${index + 1}`}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Input
                                                id="camera_url"
                                                placeholder={getCameraPlaceholder()}
                                                value={data.camera_url}
                                                onChange={(e) => setData('camera_url', e.target.value)}
                                                required
                                                className="text-sm"
                                            />
                                        )}
                                        <p className="text-xs text-muted-foreground">{getCameraHelpText()}</p>
                                        <InputError message={errors.camera_url} />
                                    </div>

                                </TooltipProvider>

                                <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:pt-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => router.visit('/dashboard')}
                                        className="flex-1 text-sm"
                                    >
                                        Cancelar
                                    </Button>

                                    <Button type="submit" disabled={processing} className="flex-1 text-sm">
                                        {processing ? 'Criando...' : 'Criar Sessão'}
                                    </Button>
                                </div>

                                    </form>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
