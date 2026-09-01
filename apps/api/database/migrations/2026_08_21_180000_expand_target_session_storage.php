<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('system_target_sessions')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE system_target_sessions MODIFY storage MEDIUMTEXT NULL');
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('system_target_sessions')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE system_target_sessions MODIFY storage TEXT NULL');
        }
    }
};
