<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('system_target_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('system_id')->constrained()->cascadeOnDelete();
            $table->string('auth_type', 32);
            $table->text('headers');
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'system_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('system_target_sessions');
    }
};
