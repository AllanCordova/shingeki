<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('system_results', function (Blueprint $table) {
            $table->foreignUuid('attack_dispatch_id')
                ->nullable()
                ->after('system_id')
                ->constrained('attack_dispatches')
                ->nullOnDelete();

            $table->index('attack_dispatch_id');
        });
    }

    public function down(): void
    {
        Schema::table('system_results', function (Blueprint $table) {
            $table->dropConstrainedForeignId('attack_dispatch_id');
        });
    }
};
