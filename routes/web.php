<?php

use App\Http\Controllers\FallAlertController;
use App\Http\Controllers\MonitoringSessionController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    // Dashboard - Main entry point after login
    Route::get('dashboard', [MonitoringSessionController::class, 'index'])->name('dashboard');

    // Monitoring Sessions
    Route::prefix('monitoring')->name('monitoring.')->group(function () {
        Route::get('/create', [MonitoringSessionController::class, 'create'])->name('create');
        Route::post('/', [MonitoringSessionController::class, 'store'])->name('store');
        Route::get('/{session}', [MonitoringSessionController::class, 'show'])->name('show');
        Route::delete('/{session}', [MonitoringSessionController::class, 'destroy'])->name('destroy');

        // Alert actions
        Route::post('/alerts/{alert}/acknowledge', [FallAlertController::class, 'acknowledge'])
            ->name('alerts.acknowledge');
    });
});

require __DIR__.'/settings.php';
