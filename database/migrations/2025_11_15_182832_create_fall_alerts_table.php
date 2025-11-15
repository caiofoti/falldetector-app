<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fall_alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('monitoring_session_id')->constrained()->cascadeOnDelete();
            $table->timestamp('detected_at');
            $table->float('confidence_score');
            $table->string('snapshot_path')->nullable();
            $table->json('detection_metadata')->nullable();
            $table->enum('status', ['pending', 'confirmed', 'false_positive', 'resolved'])->default('pending');
            $table->text('notes')->nullable();
            $table->timestamp('acknowledged_at')->nullable();
            $table->foreignId('acknowledged_by')->nullable()->constrained('users');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fall_alerts');
    }
};
