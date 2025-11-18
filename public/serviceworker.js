// FallDetector - Service Worker Customizado
const CACHE_NAME = 'falldetector-v1';
const RUNTIME_CACHE = 'falldetector-runtime-v1';
const PRECACHE_URLS = [
    '/',
    '/dashboard',
    '/monitoring/create',
    '/offline.html'
];

// URLs que NÃO devem ser cacheadas
const EXCLUDE_CACHE = [
    '/api/',
    '/broadcasting/',
    '/reverb/',
    '/camera/',
    '/video_feed',
    '/fall-detected'
];

// Install - cachear recursos estáticos
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching precache URLs');
                return cache.addAll(PRECACHE_URLS);
            })
            .then(() => self.skipWaiting())
            .catch(err => console.error('[SW] Install failed:', err))
    );
});

// Activate - limpar caches antigos
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');

    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => self.clients.claim())
            .then(() => console.log('[SW] Activated'))
    );
});

// Fetch - estratégia de cache
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignorar requisições não-GET
    if (request.method !== 'GET') {
        return;
    }

    // Verificar se deve excluir do cache
    const shouldExclude = EXCLUDE_CACHE.some(pattern =>
        url.pathname.includes(pattern)
    );

    if (shouldExclude) {
        // Network only para estas rotas
        return;
    }

    // Estratégia: Cache First para assets, Network First para HTML
    if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|woff|woff2)$/)) {
        // Cache First para assets estáticos
        event.respondWith(
            caches.match(request)
                .then(response => {
                    if (response) {
                        return response;
                    }

                    return fetch(request).then(response => {
                        // Cachear apenas respostas válidas
                        if (!response || response.status !== 200 || response.type === 'error') {
                            return response;
                        }

                        const responseToCache = response.clone();
                        caches.open(RUNTIME_CACHE).then(cache => {
                            cache.put(request, responseToCache);
                        });

                        return response;
                    });
                })
                .catch(() => {
                    // Retornar imagem placeholder se falhar
                    if (request.destination === 'image') {
                        return new Response(
                            '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#ddd"/></svg>',
                            { headers: { 'Content-Type': 'image/svg+xml' } }
                        );
                    }
                })
        );
    } else {
        // Network First para HTML
        event.respondWith(
            fetch(request)
                .then(response => {
                    if (!response || response.status !== 200) {
                        return response;
                    }

                    const responseToCache = response.clone();
                    caches.open(RUNTIME_CACHE).then(cache => {
                        cache.put(request, responseToCache);
                    });

                    return response;
                })
                .catch(() => {
                    return caches.match(request)
                        .then(response => {
                            if (response) {
                                return response;
                            }
                            // Página offline como fallback
                            return caches.match('/offline.html');
                        });
                })
        );
    }
});

// Mensagens do cliente
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
            }).then(() => {
                console.log('[SW] All caches cleared');
            })
        );
    }
});

// Notificações push (futuro)
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();

        const options = {
            body: data.body || 'Nova notificação do FallDetector',
            icon: '/images/icons/icon-192x192.png',
            badge: '/images/icons/icon-72x72.png',
            vibrate: [200, 100, 200],
            tag: data.tag || 'falldetector-notification',
            requireInteraction: true,
            actions: data.actions || []
        };

        event.waitUntil(
            self.registration.showNotification(data.title || 'FallDetector', options)
        );
    }
});

// Clique em notificação
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                // Se já tem uma janela aberta, focar nela
                for (const client of clientList) {
                    if (client.url.includes('/dashboard') && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Caso contrário, abrir nova janela
                if (clients.openWindow) {
                    return clients.openWindow('/dashboard');
                }
            })
    );
});

console.log('[SW] Service Worker loaded');
