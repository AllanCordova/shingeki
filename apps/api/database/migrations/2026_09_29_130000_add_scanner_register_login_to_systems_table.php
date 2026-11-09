<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('systems', function (Blueprint $table) {
            $table->string('login_mode')->default('credentials')->after('login_url');
            $table->string('register_url', 2048)->nullable()->after('login_mode');
        });
    }

    public function down(): void
    {
        Schema::table('systems', function (Blueprint $table) {
            $table->dropColumn(['login_mode', 'register_url']);
        });
    }
};
