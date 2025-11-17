import { usePWAInstall } from '@/hooks/use-pwa-install';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export function PWAInstallPrompt() {
    const { isInstallable, promptInstall, dismissPrompt } = usePWAInstall();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isInstallable) {
            const timer = setTimeout(() => setIsVisible(true), 2000);
            return () => clearTimeout(timer);
        }
    }, [isInstallable]);

    if (!isVisible || !isInstallable) return null;

    const handleInstall = async () => {
        const installed = await promptInstall();
        if (installed) {
            setIsVisible(false);
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        dismissPrompt();
    };

    return (
        <div className="fixed bottom-6 right-4 z-50 animate-in slide-in-from-bottom-5 sm:right-6 md:right-10">
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-[#D1CCC0] dark:border-gray-700 p-4 max-w-sm">
                <button
                    onClick={handleDismiss}
                    className="absolute -top-2 -right-2 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400
                             rounded-full p-1.5 shadow hover:text-gray-700 dark:hover:text-gray-200 transition"
                >
                    <X className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-[#979B80] rounded-lg flex items-center justify-center">
                        <Download className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm mb-1">Instalar FallDetector</h3>
                        <p className="text-xs text-muted-foreground mb-3">
                            Instale o aplicativo para acesso rápido e notificações
                        </p>
                        <Button
                            onClick={handleInstall}
                            size="sm"
                            className="w-full"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Instalar Agora
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
