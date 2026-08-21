<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('remediation_runs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('system_id')->constrained('systems')->cascadeOnDelete();
            $table->foreignUuid('attack_dispatch_id')->nullable()->constrained('attack_dispatches')->nullOnDelete();
            $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type', 32);
            $table->unsignedInteger('findings_count')->default(0);
            $table->string('provider', 32)->nullable();
            $table->string('model', 64)->nullable();
            $table->timestamps();

            $table->index(['system_id', 'created_at']);
            $table->index(['system_id', 'type', 'created_at']);
        });

        $this->backfillAiRuns();
    }

    public function down(): void
    {
        Schema::dropIfExists('remediation_runs');
    }

    private function backfillAiRuns(): void
    {
        if (! Schema::hasTable('ai_remediation_suggestions')) {
            return;
        }

        $suggestions = DB::table('ai_remediation_suggestions as suggestions')
            ->join('attack_dispatches as dispatches', 'dispatches.id', '=', 'suggestions.attack_dispatch_id')
            ->select([
                'dispatches.system_id',
                'suggestions.attack_dispatch_id',
                'suggestions.provider',
                'suggestions.model',
                'suggestions.created_at',
            ])
            ->orderBy('suggestions.created_at')
            ->get();

        $groups = [];

        foreach ($suggestions as $suggestion) {
            $bucket = substr((string) $suggestion->created_at, 0, 16);
            $key = implode('|', [
                $suggestion->system_id,
                $suggestion->attack_dispatch_id,
                $suggestion->provider,
                $suggestion->model,
                $bucket,
            ]);

            if (! isset($groups[$key])) {
                $groups[$key] = [
                    'system_id' => $suggestion->system_id,
                    'attack_dispatch_id' => $suggestion->attack_dispatch_id,
                    'provider' => $suggestion->provider,
                    'model' => $suggestion->model,
                    'findings_count' => 0,
                    'created_at' => $suggestion->created_at,
                ];
            }

            $groups[$key]['findings_count']++;
        }

        $now = now();

        foreach ($groups as $group) {
            DB::table('remediation_runs')->insert([
                'id' => (string) Str::uuid(),
                'system_id' => $group['system_id'],
                'attack_dispatch_id' => $group['attack_dispatch_id'],
                'user_id' => null,
                'type' => 'ai_suggestion',
                'findings_count' => $group['findings_count'],
                'provider' => $group['provider'],
                'model' => $group['model'],
                'created_at' => $group['created_at'],
                'updated_at' => $now,
            ]);
        }
    }
};
