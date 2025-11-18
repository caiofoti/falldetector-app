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

// API routes públicas para Python service (ANTES do middleware auth)
Route::prefix('api')->group(function () {
    Route::post('/fall-detected', [CameraStreamController::class, 'handleFallDetection'])
        ->name('api.fall-detected');

    Route::get('/health', [CameraStreamController::class, 'healthCheck'])
        ->name('api.health');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [MonitoringSessionController::class, 'index'])->name('dashboard');

    Route::prefix('camera/{session}')->name('camera.')->group(function () {
        Route::get('/stream', [CameraStreamController::class, 'stream'])->name('stream');
        Route::get('/status', [CameraStreamController::class, 'checkStatus'])->name('status');
        Route::post('/start', [CameraStreamController::class, 'startMonitoring'])->name('start');
        Route::post('/stop', [CameraStreamController::class, 'stopMonitoring'])->name('stop');
    });

    Route::prefix('monitoring')->name('monitoring.')->group(function () {
        Route::get('/sessions', [MonitoringSessionController::class, 'sessions'])->name('sessions');
        Route::get('/create', [MonitoringSessionController::class, 'create'])->name('create');
        Route::post('/', [MonitoringSessionController::class, 'store'])->name('store');
        Route::get('/{session}', [MonitoringSessionController::class, 'show'])->name('show');
        Route::delete('/{session}', [MonitoringSessionController::class, 'destroy'])->name('destroy');

        Route::post('/alerts/{alert}/acknowledge', [FallAlertController::class, 'acknowledge'])
            ->name('alerts.acknowledge');
    });

    Route::prefix('api/monitoring')->group(function () {
        Route::get('/{session}/alerts', [MonitoringApiController::class, 'getAlerts']);
        Route::get('/{session}/stats', [MonitoringApiController::class, 'getStats']);
    });
});

require __DIR__.'/settings.php';
