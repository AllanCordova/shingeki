<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('systems', function (Blueprint $table) {
            $table->string('login_url')->nullable()->after('target_url');
        });

        Schema::create('target_session_capture_tickets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('system_id')->constrained()->cascadeOnDelete();
            $table->string('client_origin', 2048);
            $table->timestamp('expires_at');
            $table->timestamp('consumed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('target_session_capture_tickets');

        Schema::table('systems', function (Blueprint $table) {
            $table->dropColumn('login_url');
        });
    }
};
