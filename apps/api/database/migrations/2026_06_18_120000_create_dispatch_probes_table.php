<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dispatch_probes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('attack_dispatch_id')->constrained('attack_dispatches')->cascadeOnDelete();
            $table->foreignUuid('system_id')->constrained('systems')->cascadeOnDelete();
            $table->foreignUuid('attack_id')->constrained('attacks')->cascadeOnDelete();
            $table->text('route');
            $table->text('payload_used');
            $table->text('http_request')->nullable();
            $table->string('outcome', 32);
            $table->text('evidence');
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->index(['attack_dispatch_id', 'outcome']);
        });

        Schema::table('attack_dispatches', function (Blueprint $table) {
            $table->unsignedInteger('probes_count')->default(0)->after('findings_count');
            $table->unsignedInteger('vectors_discovered')->nullable()->after('probes_count');
            $table->unsignedInteger('jobs_planned')->nullable()->after('vectors_discovered');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dispatch_probes');

        Schema::table('attack_dispatches', function (Blueprint $table) {
            $table->dropColumn(['probes_count', 'vectors_discovered', 'jobs_planned']);
        });
    }
};
