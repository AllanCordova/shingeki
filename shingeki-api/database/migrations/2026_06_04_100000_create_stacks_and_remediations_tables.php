<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stacks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('slug')->unique();
            $table->string('name');
            $table->json('languages');
            $table->timestamps();
        });

        Schema::create('system_stack', function (Blueprint $table) {
            $table->foreignUuid('system_id')->constrained('systems')->cascadeOnDelete();
            $table->foreignUuid('stack_id')->constrained('stacks')->cascadeOnDelete();
            $table->boolean('is_primary')->default(false);
            $table->primary(['system_id', 'stack_id']);
        });

        Schema::create('remediations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('stack_id')->constrained('stacks')->cascadeOnDelete();
            $table->string('scan_type')->nullable();
            $table->string('attack_category')->nullable();
            $table->string('semgrep_rule_id')->nullable();
            $table->string('title');
            $table->text('description');
            $table->text('code_snippet');
            $table->json('references')->nullable();
            $table->timestamps();

            $table->index(['stack_id', 'semgrep_rule_id']);
            $table->index(['stack_id', 'attack_category', 'scan_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('remediations');
        Schema::dropIfExists('system_stack');
        Schema::dropIfExists('stacks');
    }
};
