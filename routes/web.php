<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    Route::prefix('monitoring')->name('monitoring.')->group(function () {
        Route::get('/', [MonitoringSessionController::class, 'index'])->name('index');
        Route::post('/', [MonitoringSessionController::class, 'store'])->name('store');
        Route::get('/{session}', [MonitoringSessionController::class, 'show'])->name('show');
        Route::delete('/{session}', [MonitoringSessionController::class, 'destroy'])->name('destroy');

        Route::post('/alerts/{alert}/acknowledge', [FallAlertController::class, 'acknowledge'])
            ->name('alerts.acknowledge');
    });
});

require __DIR__.'/settings.php';
