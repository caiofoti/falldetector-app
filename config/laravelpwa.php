<?php

return [
    'name' => 'FallDetector',
    'manifest' => [
        'name' => env('APP_NAME', 'FallDetector'),
        'short_name' => 'FallDetector',
        'start_url' => '/',
        'background_color' => '#FFFFFF',
        'theme_color' => '#979B80',
        'display' => 'standalone',
        'orientation' => 'portrait',
        'status_bar' => 'default',
        'icons' => [
            '72x72' => [
                'path' => '/images/icons/icon-72x72.png',
                'purpose' => 'any'
            ],
            '96x96' => [
                'path' => '/images/icons/icon-96x96.png',
                'purpose' => 'any'
            ],
            '128x128' => [
                'path' => '/images/icons/icon-128x128.png',
                'purpose' => 'any'
            ],
            '144x144' => [
                'path' => '/images/icons/icon-144x144.png',
                'purpose' => 'any'
            ],
            '152x152' => [
                'path' => '/images/icons/icon-152x152.png',
                'purpose' => 'any'
            ],
            '192x192' => [
                'path' => '/images/icons/icon-192x192.png',
                'purpose' => 'any'
            ],
            '384x384' => [
                'path' => '/images/icons/icon-384x384.png',
                'purpose' => 'any'
            ],
            '512x512' => [
                'path' => '/images/icons/icon-512x512.png',
                'purpose' => 'any'
            ],
        ],
        'splash' => [
            '640x1136' => '/images/splash/splash-640x1136.png',
            '750x1334' => '/images/splash/splash-750x1334.png',
            '828x1792' => '/images/splash/splash-828x1792.png',
            '1125x2436' => '/images/splash/splash-1125x2436.png',
            '1242x2208' => '/images/splash/splash-1242x2208.png',
            '1242x2688' => '/images/splash/splash-1242x2688.png',
            '1536x2048' => '/images/splash/splash-1536x2048.png',
            '1668x2224' => '/images/splash/splash-1668x2224.png',
            '1668x2388' => '/images/splash/splash-1668x2388.png',
            '2048x2732' => '/images/splash/splash-2048x2732.png',
        ],
        'shortcuts' => [
            [
                'name' => 'Nova Sessão',
                'description' => 'Criar nova sessão de monitoramento',
                'url' => '/monitoring/create',
                'icons' => [
                    "src" => "/images/icons/icon-96x96.png",
                    "purpose" => "any"
                ]
            ],
            [
                'name' => 'Painel',
                'description' => 'Acessar painel de monitoramento',
                'url' => '/dashboard',
                'icons' => [
                    "src" => "/images/icons/icon-96x96.png",
                    "purpose" => "any"
                ]
            ]
        ],
        'custom' => []
    ]
];
