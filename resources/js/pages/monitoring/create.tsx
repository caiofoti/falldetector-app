import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft, Info } from 'lucide-react';
import InputError from '@/components/input-error';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';

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

    const getCameraPlaceholder = () => {
        switch (data.camera_type) {
            case 'webcam':
                return '0 (câmera padrão)';
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
                return 'Digite 0 para webcam padrão, 1 para segunda câmera, etc.';
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

            <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.visit('/dashboard')}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold">Nova Sessão de Monitoramento</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Configure sua câmera de detecção de quedas
                        </p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Configuração da Sessão</CardTitle>
                        <CardDescription>
                            Configure sua sessão de monitoramento com os detalhes da câmera
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <TooltipProvider>
                                {/* Nome */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="name">
                                            Nome da Sessão <span className="text-red-500">*</span>
                                        </Label>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="max-w-xs">Escolha um nome descritivo para identificar facilmente esta sessão de monitoramento</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                    <Input
                                        id="name"
                                        placeholder="ex: Monitor da Sala de Estar"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        required
                                    />
                                    <InputError message={errors.name} />
                                </div>

                                {/* Descrição */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="description">Descrição</Label>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="max-w-xs">Adicione detalhes opcionais sobre o ambiente ou propósito desta sessão</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                    <Textarea
                                        id="description"
                                        placeholder="Descrição opcional"
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        rows={3}
                                    />
                                    <InputError message={errors.description} />
                                </div>

                                {/* Tipo de Câmera */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="camera_type">
                                            Tipo de Câmera <span className="text-red-500">*</span>
                                        </Label>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="max-w-xs">Selecione o tipo de câmera que será utilizada para monitoramento</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                    <Select
                                        value={data.camera_type}
                                        onValueChange={(value) => setData('camera_type', value)}
                                    >
                                        <SelectTrigger id="camera_type">
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

                                {/* URL/ID da Câmera */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="camera_url">
                                            URL/ID da Câmera <span className="text-red-500">*</span>
                                        </Label>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="max-w-xs">{getCameraHelpText()}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                    <Input
                                        id="camera_url"
                                        placeholder={getCameraPlaceholder()}
                                        value={data.camera_url}
                                        onChange={(e) => setData('camera_url', e.target.value)}
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {getCameraHelpText()}
                                    </p>
                                    <InputError message={errors.camera_url} />
                                </div>
                            </TooltipProvider>

                            {/* Info Box */}
                            <div className="bg-[#BAD4D0]/20 dark:bg-[#979B80]/20 border border-[#BAD4D0] dark:border-[#979B80] rounded-lg p-4">
                                <h4 className="font-medium text-sm mb-2">Como funciona</h4>
                                <ul className="text-xs space-y-1 text-muted-foreground">
                                    <li>• O sistema monitorará continuamente o feed de vídeo</li>
                                    <li>• A IA detecta possíveis quedas em tempo real</li>
                                    <li>• Você receberá notificações instantâneas quando uma queda for detectada</li>
                                    <li>• Todos os alertas são registrados com timestamps e capturas de tela</li>
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
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="flex-1"
                                >
                                    {processing ? 'Criando...' : 'Criar Sessão'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
