<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attack_dispatches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('system_id')->constrained('systems')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedInteger('attacks_count');
            $table->timestamp('dispatched_at');
            $table->timestamps();

            $table->index(['system_id', 'dispatched_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attack_dispatches');
    }
};
