import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft, Camera, Info } from 'lucide-react';
import InputError from '@/components/input-error';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import { useEffect, useRef, useState } from 'react';

export default function Create() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
    const [previewError, setPreviewError] = useState<string>('');

    const { data, setData, post, processing, errors } = useForm({
        name: '',
        description: '',
        camera_type: 'webcam',
        camera_url: '0',
    });

    // Listar câmeras disponíveis
    useEffect(() => {
        const getDevices = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(device => device.kind === 'videoinput');
                setCameraDevices(videoDevices);
            } catch (error) {
                console.error('Erro ao listar câmeras:', error);
            }
        };

        getDevices();
    }, []);

    // Preview da câmera
    useEffect(() => {
        const startPreview = async () => {
            if (data.camera_type !== 'webcam') {
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

                const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
                setStream(mediaStream);

                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch (error: any) {
                setPreviewError(error.message || 'Erro ao acessar câmera');
                console.error('Erro ao iniciar preview:', error);
            }
        };

        startPreview();

        return () => {
            stopPreview();
        };
    }, [data.camera_type, data.camera_url]);

    const stopPreview = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

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

            <div className="p-4 space-y-4 max-w-4xl mx-auto md:p-6 md:space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.visit('/dashboard')}
                        className="shrink-0"
                    >
                        <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold truncate sm:text-2xl md:text-3xl">Nova Sessão</h1>
                        <p className="text-xs text-muted-foreground mt-0.5 sm:text-sm">
                            Configure sua câmera de detecção
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 md:gap-6">
                    {/* Preview Card */}
                    <Card className="md:sticky md:top-4 md:self-start">
                        <CardHeader>
                            <CardTitle className="text-base sm:text-lg">Preview da Câmera</CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                Visualize o que a câmera está captando
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                                {data.camera_type === 'webcam' ? (
                                    <>
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            className="w-full h-full object-cover"
                                        />
                                        {previewError && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4">
                                                <div className="text-center text-white">
                                                    <Camera className="mx-auto mb-2 h-8 w-8 sm:h-12 sm:w-12" />
                                                    <p className="text-xs sm:text-sm">{previewError}</p>
                                                </div>
                                            </div>
                                        )}
                                        {!stream && !previewError && (
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

                    {/* Form Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base sm:text-lg">Configuração</CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                Preencha os dados da sessão
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                                <TooltipProvider>
                                    {/* Nome */}
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

                                    {/* Descrição */}
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

                                    {/* Tipo de Câmera */}
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

                                    {/* Seleção de Câmera */}
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
                                        <p className="text-xs text-muted-foreground">
                                            {getCameraHelpText()}
                                        </p>
                                        <InputError message={errors.camera_url} />
                                    </div>
                                </TooltipProvider>

                                {/* Actions */}
                                <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:pt-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => router.visit('/dashboard')}
                                        className="flex-1 text-sm"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        className="flex-1 text-sm"
                                    >
                                        {processing ? 'Criando...' : 'Criar Sessão'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
