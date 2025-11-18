import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallButton() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showButton, setShowButton] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Verificar se já está instalado
        const checkInstalled = () => {
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
            const isIOSInstalled = (window.navigator as any).standalone === true;
            return isStandalone || isIOSInstalled;
        };

        if (checkInstalled()) {
            setIsInstalled(true);
            setShowButton(false);
            return;
        }

        // Listener para beforeinstallprompt
        const handler = (e: BeforeInstallPromptEvent) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowButton(true);
            console.log('PWA install prompt captured');
        };

        window.addEventListener('beforeinstallprompt', handler as EventListener);

        // Listener para appinstalled
        const installedHandler = () => {
            console.log('PWA installed successfully');
            setIsInstalled(true);
            setShowButton(false);
            setDeferredPrompt(null);
        };

        window.addEventListener('appinstalled', installedHandler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler as EventListener);
            window.removeEventListener('appinstalled', installedHandler);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            console.warn('No deferred prompt available');
            return;
        }

        try {
            // Registrar service worker ANTES de mostrar prompt
            if ('serviceWorker' in navigator) {
                try {
                    const registration = await navigator.serviceWorker.register('/serviceworker.js', {
                        scope: '/'
                    });
                    console.log('Service Worker registered:', registration);
                } catch (error) {
                    console.error('Service Worker registration failed:', error);
                }
            }

            // Mostrar prompt de instalação
            await deferredPrompt.prompt();

            const { outcome } = await deferredPrompt.userChoice;
            console.log('User choice:', outcome);

            if (outcome === 'accepted') {
                setDeferredPrompt(null);
                setShowButton(false);
                setIsInstalled(true);
            }
        } catch (error) {
            console.error('Error installing PWA:', error);
        }
    };

    // Não mostrar botão se já instalado ou não houver prompt
    if (isInstalled || !showButton) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 md:bottom-6 md:right-6">
            <div className="relative animate-in slide-in-from-bottom-5 fade-in duration-500">
                <Button
                    size="lg"
                    onClick={handleInstallClick}
                    className="bg-[#979B80] hover:bg-[#858968] text-white shadow-xl hover:shadow-2xl transition-all duration-300 pr-8"
                >
                    <Download className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Instalar FallDetector</span>
                    <span className="sm:hidden">Instalar App</span>
                </Button>
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setShowButton(false)}
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white dark:bg-gray-800 shadow-md hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                    <X className="h-3 w-3" />
                </Button>
            </div>
        </div>
    );
}
