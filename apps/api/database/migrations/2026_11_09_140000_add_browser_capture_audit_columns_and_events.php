<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('browser_capture_sessions', function (Blueprint $table) {
            if (! Schema::hasColumn('browser_capture_sessions', 'browser_opened_at')) {
                $table->timestamp('browser_opened_at')->nullable()->after('user_agent');
            }
            if (! Schema::hasColumn('browser_capture_sessions', 'browser_opened_ip')) {
                $table->string('browser_opened_ip', 45)->nullable()->after('browser_opened_at');
            }
            if (! Schema::hasColumn('browser_capture_sessions', 'browser_opened_user_agent')) {
                $table->text('browser_opened_user_agent')->nullable()->after('browser_opened_ip');
            }
            if (! Schema::hasColumn('browser_capture_sessions', 'source')) {
                $table->string('source', 32)->nullable()->after('browser_opened_user_agent');
            }
        });

        if (! Schema::hasTable('browser_capture_events')) {
            Schema::create('browser_capture_events', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('browser_capture_session_id')
                    ->constrained('browser_capture_sessions')
                    ->cascadeOnDelete();
                $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
                $table->string('event', 32);
                $table->text('url')->nullable();
                $table->string('ip_address', 45)->nullable();
                $table->text('user_agent')->nullable();
                $table->json('meta')->nullable();
                $table->timestamp('created_at')->useCurrent();

                $table->index(['browser_capture_session_id', 'created_at'], 'bce_session_created_idx');
                $table->index(['user_id', 'created_at'], 'bce_user_created_idx');
                $table->index(['event', 'created_at'], 'bce_event_created_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('browser_capture_events');

        Schema::table('browser_capture_sessions', function (Blueprint $table) {
            $table->dropColumn([
                'browser_opened_at',
                'browser_opened_ip',
                'browser_opened_user_agent',
                'source',
            ]);
        });
    }
};
