<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('system_results', function (Blueprint $table) {
            $table->string('dedupe_key', 64)->nullable()->unique();
            $table->index(['attack_dispatch_id', 'created_at']);
        });

        Schema::table('dispatch_probes', function (Blueprint $table) {
            $table->string('dedupe_key', 64)->nullable()->unique();
            $table->index(['attack_dispatch_id', 'created_at']);
        });

        Schema::table('attack_dispatches', function (Blueprint $table) {
            $table->index(['system_id', 'completed_at']);
        });

        Schema::table('signatures', function (Blueprint $table) {
            $table->index(['user_id', 'system_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('system_results', function (Blueprint $table) {
            $table->dropUnique(['dedupe_key']);
            $table->dropIndex(['attack_dispatch_id', 'created_at']);
            $table->dropColumn('dedupe_key');
        });

        Schema::table('dispatch_probes', function (Blueprint $table) {
            $table->dropUnique(['dedupe_key']);
            $table->dropIndex(['attack_dispatch_id', 'created_at']);
            $table->dropColumn('dedupe_key');
        });

        Schema::table('attack_dispatches', function (Blueprint $table) {
            $table->dropIndex(['system_id', 'completed_at']);
        });

        Schema::table('signatures', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'system_id', 'created_at']);
        });
    }
};
