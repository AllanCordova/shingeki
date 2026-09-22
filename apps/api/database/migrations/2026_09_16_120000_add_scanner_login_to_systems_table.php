<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('systems', function (Blueprint $table) {
            $table->text('login_username')->nullable()->after('login_url');
            $table->text('login_password')->nullable()->after('login_username');
            $table->string('logged_in_indicator')->nullable()->after('login_password');
        });
    }

    public function down(): void
    {
        Schema::table('systems', function (Blueprint $table) {
            $table->dropColumn(['login_username', 'login_password', 'logged_in_indicator']);
        });
    }
};
