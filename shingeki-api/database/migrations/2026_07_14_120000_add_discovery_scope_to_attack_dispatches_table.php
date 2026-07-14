<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attack_dispatches', function (Blueprint $table) {
            $table->string('start_path')->nullable()->after('depth');
            $table->unsignedInteger('max_routes')->nullable()->after('start_path');
        });
    }

    public function down(): void
    {
        Schema::table('attack_dispatches', function (Blueprint $table) {
            $table->dropColumn(['start_path', 'max_routes']);
        });
    }
};
