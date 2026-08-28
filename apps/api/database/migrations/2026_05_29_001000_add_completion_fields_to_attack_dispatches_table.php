<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attack_dispatches', function (Blueprint $table) {
            $table->timestamp('completed_at')->nullable()->after('dispatched_at');
            $table->unsignedBigInteger('duration_ms')->nullable()->after('completed_at');
            $table->unsignedInteger('findings_count')->default(0)->after('duration_ms');
        });
    }

    public function down(): void
    {
        Schema::table('attack_dispatches', function (Blueprint $table) {
            $table->dropColumn(['completed_at', 'duration_ms', 'findings_count']);
        });
    }
};
