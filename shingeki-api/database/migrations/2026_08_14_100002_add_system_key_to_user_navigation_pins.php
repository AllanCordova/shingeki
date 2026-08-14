<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_navigation_pins', function (Blueprint $table) {
            $table->string('system_key', 36)->default('');
        });

        $pins = DB::table('user_navigation_pins')->get();

        foreach ($pins as $pin) {
            DB::table('user_navigation_pins')
                ->where('id', $pin->id)
                ->update(['system_key' => $pin->system_id ?? '']);
        }

        Schema::table('user_navigation_pins', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'project_id', 'system_id']);
            $table->unique(['user_id', 'project_id', 'system_key']);
        });
    }

    public function down(): void
    {
        Schema::table('user_navigation_pins', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'project_id', 'system_key']);
            $table->unique(['user_id', 'project_id', 'system_id']);
            $table->dropColumn('system_key');
        });
    }
};
