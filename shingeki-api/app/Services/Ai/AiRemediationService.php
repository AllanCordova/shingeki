<?php

namespace App\Services\Ai;

use App\Models\AiRemediationSuggestion;
use App\Models\AttackDispatch;
use App\Models\Stack;
use App\Models\System;
use App\Models\SystemResult;
use App\Services\Remediation\RemediationResolver;
use App\Services\Source\SourceContextService;
use Illuminate\Support\Collection;
use RuntimeException;

class AiRemediationService
{
    public function __construct(
        private readonly SourceContextService $sourceContext,
        private readonly RemediationResolver $remediationResolver,
        private readonly AiPromptBuilder $promptBuilder,
        private readonly LlmClientManager $llmManager,
        private readonly AiResponseValidator $responseValidator,
        private readonly SnippetSyntaxValidator $syntaxValidator,
    ) {}

    /**
     * @param  list<string>|null  $findingIds
     * @return array{
     *   provider: string,
     *   model: string,
     *   findings: list<array<string, mixed>>
     * }
     */
    public function generate(
        System $system,
        AttackDispatch $dispatch,
        Collection $results,
        ?array $findingIds = null,
        bool $regenerate = false,
    ): array {
        if ($findingIds !== null && $findingIds !== []) {
            $results = $results->whereIn('id', $findingIds)->values();
        }

        $max = (int) config('ai.max_findings_per_request', 5);

        if ($results->count() > $max) {
            $results = $results->take($max)->values();
        }

        $client = $this->llmManager->client();
        $findings = [];

        foreach ($results as $result) {
            $findings[] = $this->generateForResult(
                $system,
                $dispatch,
                $result,
                $client,
                $regenerate,
            );
        }

        return [
            'provider' => $client->name(),
            'model' => $client->model(),
            'findings' => $findings,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function generateForResult(
        System $system,
        AttackDispatch $dispatch,
        SystemResult $result,
        LlmClient $client,
        bool $regenerate,
    ): array {
        $result->loadMissing(['attack', 'attackDispatch']);
        $source = $this->sourceContext->resolve($system, $result);
        $catalogSnippets = $this->remediationResolver->resolveForResult($result, $system->stacks);
        $primaryStack = $this->resolvePrimaryStack($system, $catalogSnippets);

        $findingPayload = [
            'system_result_id' => $result->id,
            'scan_type' => $result->attackDispatch?->scan_type?->value,
            'vulnerable_route' => $result->vulnerable_route,
            'payload_used' => $result->payload_used,
            'evidence' => $result->evidence,
            'http_request' => $result->http_request,
            'attack' => $result->attack ? [
                'category' => $result->attack->category->value,
                'target_location' => $result->attack->target_location->value,
                'risk_level' => $result->attack->risk_level->value,
            ] : null,
        ];

        $promptHash = hash('sha256', json_encode([
            $result->id,
            $result->updated_at?->toISOString(),
            $source->toArray(),
            $catalogSnippets,
            $primaryStack->slug,
        ], JSON_THROW_ON_ERROR));

        if (! $regenerate) {
            $cached = AiRemediationSuggestion::query()
                ->where('system_result_id', $result->id)
                ->where('prompt_hash', $promptHash)
                ->first();

            if ($cached !== null) {
                return $this->formatFindingResponse($result, $source, $cached->response_json, true);
            }
        } else {
            AiRemediationSuggestion::query()
                ->where('system_result_id', $result->id)
                ->delete();
        }

        $systemPrompt = $this->promptBuilder->systemPrompt($primaryStack);
        $userPrompt = $this->promptBuilder->userPrompt(
            $findingPayload,
            $source->toArray(),
            $catalogSnippets,
            $primaryStack,
        );

        $payload = $this->callWithRetry($client, $systemPrompt, $userPrompt);
        $validated = $this->responseValidator->validate($payload, $result->id);

        $validated['validation']['syntax_valid'] = $this->syntaxValidator->validateForStack(
            $primaryStack,
            $validated['suggested_fix']['code'],
        );

        if ($validated['location']['file'] === null && $source->file !== null) {
            $validated['location']['file'] = $source->file;
        }

        if ($validated['location']['line'] === null && $source->line !== null) {
            $validated['location']['line'] = $source->line;
        }

        AiRemediationSuggestion::query()->updateOrCreate(
            ['system_result_id' => $result->id],
            [
                'attack_dispatch_id' => $dispatch->id,
                'provider' => $client->name(),
                'model' => $client->model(),
                'prompt_hash' => $promptHash,
                'response_json' => $validated,
            ],
        );

        return $this->formatFindingResponse($result, $source, $validated, false);
    }

    /**
     * @param  list<array<string, mixed>>  $catalogSnippets
     */
    private function resolvePrimaryStack(System $system, array $catalogSnippets): Stack
    {
        if ($catalogSnippets !== []) {
            $slug = $catalogSnippets[0]['stack']['slug'] ?? null;
            $matched = $system->stacks->firstWhere('slug', $slug);

            if ($matched instanceof Stack) {
                return $matched;
            }
        }

        $primary = $system->stacks->first(
            fn (Stack $stack) => (bool) optional($stack->pivot)->is_primary,
        );

        return $primary ?? $system->stacks->first()
            ?? throw new RuntimeException('System has no stacks configured.');
    }

    /**
     * @return array<string, mixed>
     */
    private function callWithRetry(LlmClient $client, string $systemPrompt, string $userPrompt): array
    {
        try {
            return $client->generateJson($systemPrompt, $userPrompt);
        } catch (\Throwable $first) {
            return $client->generateJson($systemPrompt, $userPrompt."\n\nReturn only valid JSON.");
        }
    }

    /**
     * @param  array<string, mixed>  $aiSuggestion
     * @return array<string, mixed>
     */
    private function formatFindingResponse(
        SystemResult $result,
        \App\Services\Source\SourceContext $source,
        array $aiSuggestion,
        bool $cached,
    ): array {
        $data = [
            'system_result_id' => $result->id,
            'attack_dispatch_id' => $result->attack_dispatch_id,
            'scan_type' => $result->attackDispatch?->scan_type?->value,
            'vulnerable_route' => $result->vulnerable_route,
            'payload_used' => $result->payload_used,
            'evidence' => $result->evidence,
            'http_request' => $result->http_request,
            'source_context' => $source->toArray(),
            'ai_suggestion' => $aiSuggestion,
            'cached' => $cached,
        ];

        if ($result->attack !== null) {
            $data['attack'] = [
                'id' => $result->attack->id,
                'category' => $result->attack->category->value,
                'target_location' => $result->attack->target_location->value,
                'risk_level' => $result->attack->risk_level->value,
            ];
        }

        return $data;
    }
}
