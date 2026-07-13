<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_navigation_pins', function (Blueprint $table) {
            $table->boolean('visible')->default(true)->after('system_id');
        });
    }

    public function down(): void
    {
        Schema::table('user_navigation_pins', function (Blueprint $table) {
            $table->dropColumn('visible');
        });
    }
};
