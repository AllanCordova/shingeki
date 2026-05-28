<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('system_results', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('system_id')->constrained('systems')->cascadeOnDelete();
            $table->foreignUuid('attack_id')->constrained('attacks')->cascadeOnDelete();
            $table->text('vulnerable_route');
            $table->text('payload_used');
            $table->text('evidence');
            $table->text('http_request');
            $table->timestamps();

            $table->index(['system_id', 'attack_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('system_results');
    }
};
