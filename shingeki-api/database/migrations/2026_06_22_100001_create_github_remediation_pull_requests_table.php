<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('github_remediation_pull_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('system_id')->constrained('systems')->cascadeOnDelete();
            $table->foreignUuid('attack_dispatch_id')->constrained('attack_dispatches')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedInteger('github_pr_number');
            $table->string('github_pr_url');
            $table->string('head_branch');
            $table->string('base_branch');
            $table->json('finding_ids');
            $table->unsignedSmallInteger('files_changed')->default(0);
            $table->timestamps();

            $table->index(['system_id', 'attack_dispatch_id'], 'gh_remediation_prs_sys_dispatch_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('github_remediation_pull_requests');
    }
};
