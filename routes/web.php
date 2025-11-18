<?php

use App\Http\Controllers\Api\MonitoringApiController;
use App\Http\Controllers\FallAlertController;
use App\Http\Controllers\MonitoringSessionController;
use App\Http\Controllers\CameraStreamController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [MonitoringSessionController::class, 'index'])->name('dashboard');

    // Camera streaming e controle
    Route::prefix('camera/{session}')->name('camera.')->group(function () {
        Route::get('/stream', [CameraStreamController::class, 'stream'])->name('stream');
        Route::get('/status', [CameraStreamController::class, 'checkStatus'])->name('status');
        Route::post('/start', [CameraStreamController::class, 'startMonitoring'])->name('start');
        Route::post('/stop', [CameraStreamController::class, 'stopMonitoring'])->name('stop');
    });

    Route::prefix('monitoring')->name('monitoring.')->group(function () {
        Route::get('/create', [MonitoringSessionController::class, 'create'])->name('create');
        Route::post('/', [MonitoringSessionController::class, 'store'])->name('store');
        Route::get('/{session}', [MonitoringSessionController::class, 'show'])->name('show');
        Route::delete('/{session}', [MonitoringSessionController::class, 'destroy'])->name('destroy');

        Route::post('/alerts/{alert}/acknowledge', [FallAlertController::class, 'acknowledge'])
            ->name('alerts.acknowledge');
    });

    // API routes para frontend
    Route::prefix('api/monitoring')->group(function () {
        Route::get('/{session}/alerts', [MonitoringApiController::class, 'getAlerts']);
        Route::get('/{session}/stats', [MonitoringApiController::class, 'getStats']);
    });
});

// API routes públicas para Python service
Route::prefix('api')->group(function () {
    // Webhook de detecção de queda
    Route::post('/fall-detected', [CameraStreamController::class, 'handleFallDetection'])
        ->withoutMiddleware([\App\Http\Middleware\Authenticate::class]);

    // Health check
    Route::get('/health', [CameraStreamController::class, 'healthCheck']);
});

require __DIR__.'/settings.php';
