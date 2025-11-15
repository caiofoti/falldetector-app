<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FallAlert extends Model
{
    protected $fillable = [
        'monitoring_session_id',
        'detected_at',
        'confidence_score',
        'snapshot_path',
        'detection_metadata',
        'status',
        'notes',
        'acknowledged_at',
        'acknowledged_by',
    ];

    protected $casts = [
        'detected_at' => 'datetime',
        'acknowledged_at' => 'datetime',
        'detection_metadata' => 'array',
        'confidence_score' => 'float',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(MonitoringSession::class, 'monitoring_session_id');
    }

    public function acknowledgedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'acknowledged_by');
    }
}
