import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
    interface Window {
        Echo: Echo;
        Pusher: typeof Pusher;
        deferredPrompt: BeforeInstallPromptEvent | null;
    }

    interface WindowEventMap {
        beforeinstallprompt: BeforeInstallPromptEvent;
        appinstalled: Event;
    }
}

export {};
