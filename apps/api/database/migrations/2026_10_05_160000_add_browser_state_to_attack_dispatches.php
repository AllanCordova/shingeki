<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attack_dispatches', function (Blueprint $table) {
            $table->json('browser_state')->nullable()->after('route_map');
            $table->timestamp('session_expired_at')->nullable()->after('failed_at');
        });
    }

    public function down(): void
    {
        Schema::table('attack_dispatches', function (Blueprint $table) {
            $table->dropColumn(['browser_state', 'session_expired_at']);
        });
    }
};
