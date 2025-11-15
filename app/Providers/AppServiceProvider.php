<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Models\FallAlert;
use App\Models\MonitoringSession;
use App\Policies\FallAlertPolicy;
use App\Policies\MonitoringSessionPolicy;
use Illuminate\Support\Facades\Gate;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(MonitoringSession::class, MonitoringSessionPolicy::class);
        Gate::policy(FallAlert::class, FallAlertPolicy::class);
    }
}
