<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attacks', function (Blueprint $table) {
            $table->string('scan_type')->default('DAST')->after('user_id');
            $table->index('scan_type');
        });

        Schema::table('attack_dispatches', function (Blueprint $table) {
            $table->string('scan_type')->default('DAST')->after('user_id');
            $table->index('scan_type');
        });
    }

    public function down(): void
    {
        Schema::table('attacks', function (Blueprint $table) {
            $table->dropIndex(['scan_type']);
            $table->dropColumn('scan_type');
        });

        Schema::table('attack_dispatches', function (Blueprint $table) {
            $table->dropIndex(['scan_type']);
            $table->dropColumn('scan_type');
        });
    }
};
