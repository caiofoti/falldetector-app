<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title inertia>{{ config('app.name', 'Laravel') }}</title>

    @laravelPWA
    @viteReactRefresh
    @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
    @inertiaHead
</head>
<body class="font-sans antialiased">
@inertia

<script>
    // Só exibe o botão em rotas autenticadas
    const isAuthRoute = window.location.pathname !== '/' &&
        window.location.pathname !== '/login' &&
        window.location.pathname !== '/register';

    if (isAuthRoute) {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            window.deferredPrompt = e;

            if (document.getElementById('pwa-install-btn')) return;

            const btnContainer = document.createElement('div');
            btnContainer.id = 'pwa-install-btn';
            btnContainer.className = 'fixed top-[100px] right-4 z-[99999] sm:right-6 md:right-10 lg:right-16';

            const btn = document.createElement('button');
            btn.className = 'bg-[#979B80] hover:bg-[#858968] text-white font-semibold px-3 py-2 rounded-full shadow-lg flex items-center gap-2 transition-transform hover:scale-105 text-xs sm:text-sm md:text-base min-w-[140px] sm:min-w-[160px] md:min-w-[180px] relative';
            btn.innerHTML = `
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
                    </svg>
                    Instalar FallDetector
                `;
            btn.onclick = function () {
                window.deferredPrompt.prompt();
                btnContainer.remove();
            };

            const closeBtn = document.createElement('button');
            closeBtn.className = 'absolute -top-2 -right-2 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full p-1.5 shadow hover:text-gray-700 dark:hover:text-gray-200 transition';
            closeBtn.innerHTML = `
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                `;
            closeBtn.onclick = function () {
                btnContainer.remove();
            };

            btnContainer.appendChild(btn);
            btnContainer.appendChild(closeBtn);
            document.body.appendChild(btnContainer);
        });
    }
</script>
</body>
</html>
