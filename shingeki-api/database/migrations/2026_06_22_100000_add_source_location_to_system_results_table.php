<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('system_results', function (Blueprint $table) {
            $table->string('source_file')->nullable()->after('http_request');
            $table->unsignedInteger('start_line')->nullable()->after('source_file');
            $table->unsignedInteger('end_line')->nullable()->after('start_line');
            $table->text('matched_snippet')->nullable()->after('end_line');
        });
    }

    public function down(): void
    {
        Schema::table('system_results', function (Blueprint $table) {
            $table->dropColumn(['source_file', 'start_line', 'end_line', 'matched_snippet']);
        });
    }
};
