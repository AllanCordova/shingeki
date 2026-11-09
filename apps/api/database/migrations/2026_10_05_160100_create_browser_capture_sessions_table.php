<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('browser_capture_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('system_id')->constrained('systems')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->char('token_hash', 64)->unique();
            $table->timestamp('expires_at');
            $table->timestamp('consumed_at')->nullable();
            $table->string('depth');
            $table->string('start_path', 2048)->nullable();
            $table->unsignedInteger('max_routes')->nullable();
            $table->json('route_map')->nullable();
            $table->json('attack_ids')->nullable();
            $table->string('terms_version');
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->foreignUuid('attack_dispatch_id')->nullable()->constrained('attack_dispatches')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('browser_capture_sessions');
    }
};
