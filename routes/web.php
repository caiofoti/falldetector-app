<?php

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

    Route::get('/camera/{session}/stream', [CameraStreamController::class, 'stream'])
        ->name('camera.stream');

    Route::prefix('monitoring')->name('monitoring.')->group(function () {
        Route::get('/create', [MonitoringSessionController::class, 'create'])->name('create');
        Route::post('/', [MonitoringSessionController::class, 'store'])->name('store');
        Route::get('/{session}', [MonitoringSessionController::class, 'show'])->name('show');
        Route::delete('/{session}', [MonitoringSessionController::class, 'destroy'])->name('destroy');

        Route::post('/alerts/{alert}/acknowledge', [FallAlertController::class, 'acknowledge'])
            ->name('alerts.acknowledge');
    });

    // Placeholder routes para futuras implementações
    Route::get('/sessions/history', function () {
        return Inertia::render('sessions/history');
    })->name('sessions.history');

    Route::get('/notifications/history', function () {
        return Inertia::render('notifications/history');
    })->name('notifications.history');

    Route::get('/detection/settings', function () {
        return Inertia::render('detection/settings');
    })->name('detection.settings');

    Route::get('/pwa/settings', function () {
        return Inertia::render('pwa/settings');
    })->name('pwa.settings');
});

require __DIR__.'/settings.php';
