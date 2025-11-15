<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class MonitoringSession extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'name',
        'description',
        'camera_type',
        'camera_url',
        'camera_settings',
        'status',
        'last_activity_at',
    ];

    protected $casts = [
        'camera_settings' => 'array',
        'last_activity_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function alerts(): HasMany
    {
        return $this->hasMany(FallAlert::class);
    }

    public function recentAlerts()
    {
        return $this->alerts()->latest()->limit(10);
    }
}
