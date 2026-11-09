<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attack_dispatches', function (Blueprint $table) {
            $table->timestamp('cancelled_at')->nullable()->after('session_expired_at');
        });
    }

    public function down(): void
    {
        Schema::table('attack_dispatches', function (Blueprint $table) {
            $table->dropColumn('cancelled_at');
        });
    }
};
