<?php

namespace App\Services\Remediation;

use App\Enums\AttackScanType;
use App\Models\Remediation;
use App\Models\Stack;
use App\Models\SystemResult;
use Illuminate\Database\Eloquent\Collection;

class RemediationResolver
{
    /**
     * @param  Collection<int, Stack>  $stacks
     * @return list<array<string, mixed>>
     */
    public function resolveForResult(SystemResult $result, Collection $stacks): array
    {
        $result->loadMissing(['attack', 'attackDispatch']);

        $resolved = [];

        foreach ($stacks as $stack) {
            $remediation = $this->findRemediation($result, $stack);

            if ($remediation === null) {
                continue;
            }

            $resolved[] = $this->formatRemediation($remediation, $stack);
        }

        return $resolved;
    }

    private function findRemediation(SystemResult $result, Stack $stack): ?Remediation
    {
        $scanType = $result->attackDispatch?->scan_type;
        $category = $result->attack?->category;

        if ($scanType === AttackScanType::Sast && filled($result->payload_used)) {
            $byRule = Remediation::query()
                ->where('stack_id', $stack->id)
                ->where('semgrep_rule_id', $result->payload_used)
                ->first();

            if ($byRule !== null) {
                return $byRule;
            }
        }

        if ($category === null) {
            return null;
        }

        $language = $this->inferLanguageFromRoute($result->vulnerable_route);

        if ($scanType === AttackScanType::Sast && $language !== null) {
            $stackLanguages = $stack->languages ?? [];

            if ($stackLanguages !== [] && ! in_array($language, $stackLanguages, true)) {
                return null;
            }
        }

        return Remediation::query()
            ->where('stack_id', $stack->id)
            ->where('attack_category', $category)
            ->whereNull('semgrep_rule_id')
            ->when(
                $scanType !== null,
                fn ($query) => $query->where(fn ($inner) => $inner
                    ->whereNull('scan_type')
                    ->orWhere('scan_type', $scanType)),
            )
            ->first();
    }

    private function inferLanguageFromRoute(?string $route): ?string
    {
        if ($route === null || $route === '') {
            return null;
        }

        $path = strtolower(explode(':', $route)[0]);

        return match (true) {
            str_ends_with($path, '.php') => 'php',
            str_ends_with($path, '.ts') || str_ends_with($path, '.tsx') => 'typescript',
            str_ends_with($path, '.js') || str_ends_with($path, '.jsx') => 'javascript',
            default => null,
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function formatRemediation(Remediation $remediation, Stack $stack): array
    {
        return [
            'stack' => [
                'id' => $stack->id,
                'slug' => $stack->slug,
                'name' => $stack->name,
            ],
            'title' => $remediation->title,
            'description' => $remediation->description,
            'code_snippet' => $remediation->code_snippet,
            'references' => $remediation->references ?? [],
        ];
    }
}
