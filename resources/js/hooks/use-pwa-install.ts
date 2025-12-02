import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWAInstall() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Verificar se já está instalado
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Listener para o evento beforeinstallprompt
        const handleBeforeInstallPrompt = (e: Event) => {
            // Prevenir o prompt automático do navegador
            e.preventDefault();
            console.log('[PWA] beforeinstallprompt event captured');

            const promptEvent = e as BeforeInstallPromptEvent;
            setDeferredPrompt(promptEvent);
            setIsInstallable(true);
        };

        // Listener para quando o PWA for instalado
        const handleAppInstalled = () => {
            console.log('[PWA] App installed');
            setIsInstalled(true);
            setIsInstallable(false);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const installPWA = async () => {
        if (!deferredPrompt) {
            console.log('[PWA] No deferred prompt available');
            return false;
        }

        try {
            // Mostrar o prompt de instalação
            await deferredPrompt.prompt();

            // Aguardar a escolha do usuário
            const { outcome } = await deferredPrompt.userChoice;

            console.log(`[PWA] User choice: ${outcome}`);

            if (outcome === 'accepted') {
                setIsInstallable(false);
                setDeferredPrompt(null);
                return true;
            }

            return false;
        } catch (error) {
            console.error('[PWA] Error installing:', error);
            return false;
        }
    };

    const dismissPrompt = () => {
        setIsInstallable(false);
        setDeferredPrompt(null);
    };

    return {
        isInstallable,
        isInstalled,
        installPWA,
        dismissPrompt,
    };
}