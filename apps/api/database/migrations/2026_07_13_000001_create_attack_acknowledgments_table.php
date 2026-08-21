<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attack_acknowledgments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('project_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('system_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('attack_dispatch_id')->constrained()->cascadeOnDelete();
            $table->boolean('accepted_responsibility');
            $table->boolean('accepted_legal_terms');
            $table->string('terms_version', 32);
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('acknowledged_at');
            $table->timestamps();

            $table->index(['user_id', 'system_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attack_acknowledgments');
    }
};
