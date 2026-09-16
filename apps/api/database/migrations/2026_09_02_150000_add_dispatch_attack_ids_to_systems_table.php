<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('systems', function (Blueprint $table) {
            $table->json('dast_attack_ids')->nullable()->after('dast_start_path');
            $table->json('sast_attack_ids')->nullable()->after('dast_attack_ids');
        });
    }

    public function down(): void
    {
        Schema::table('systems', function (Blueprint $table) {
            $table->dropColumn(['dast_attack_ids', 'sast_attack_ids']);
        });
    }
};
