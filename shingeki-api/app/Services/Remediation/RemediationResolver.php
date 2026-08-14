<?php

namespace App\Services\Remediation;

use App\Enums\Scanning\AttackScanType;
use App\Models\Catalog\Remediation;
use App\Models\Catalog\Stack;
use App\Models\Scanning\SystemResult;
use Illuminate\Database\Eloquent\Collection;

class RemediationResolver
{
    /**
     * @var Collection<int, Remediation>|null
     */
    private ?Collection $catalog = null;

    /**
     * @param  Collection<int, Stack>  $stacks
     * @return list<array<string, mixed>>
     */
    public function resolveForResult(SystemResult $result, Collection $stacks): array
    {
        $result->loadMissing(['attack', 'attackDispatch']);
        $this->warm($stacks);

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

    /**
     * @param  Collection<int, Stack>  $stacks
     */
    private function warm(Collection $stacks): void
    {
        if ($this->catalog !== null) {
            return;
        }

        $stackIds = $stacks->pluck('id')->filter()->all();

        $this->catalog = $stackIds === []
            ? new Collection
            : Remediation::query()->whereIn('stack_id', $stackIds)->get();
    }

    private function findRemediation(SystemResult $result, Stack $stack): ?Remediation
    {
        $scanType = $result->attackDispatch?->scan_type;
        $category = $result->attack?->category;
        $forStack = $this->catalog?->where('stack_id', $stack->id) ?? collect();

        if ($scanType === AttackScanType::Sast && filled($result->payload_used)) {
            $byRule = $forStack->first(
                fn (Remediation $remediation): bool => $remediation->semgrep_rule_id === $result->payload_used,
            );

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

        return $forStack->first(function (Remediation $remediation) use ($category, $scanType): bool {
            if ($remediation->semgrep_rule_id !== null) {
                return false;
            }

            if ($remediation->attack_category !== $category) {
                return false;
            }

            if ($scanType === null) {
                return true;
            }

            return $remediation->scan_type === null || $remediation->scan_type === $scanType;
        });
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
