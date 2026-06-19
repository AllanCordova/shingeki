<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_remediation_suggestions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('system_result_id')->constrained('system_results')->cascadeOnDelete();
            $table->foreignUuid('attack_dispatch_id')->nullable()->constrained('attack_dispatches')->nullOnDelete();
            $table->string('provider', 32);
            $table->string('model', 64);
            $table->string('prompt_hash', 64);
            $table->json('response_json');
            $table->timestamps();

            $table->unique('system_result_id');
            $table->index(['attack_dispatch_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_remediation_suggestions');
    }
};
