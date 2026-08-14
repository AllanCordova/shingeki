<?php

namespace App\Services\Remediation;

use App\Enums\Attack\AttackScanType;
use App\Models\Remediation\Remediation;
use App\Models\System\Stack;
use App\Models\System\SystemResult;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Collection as SupportCollection;

class RemediationResolver
{
    /** @var array<string, SupportCollection<int, Remediation>> */
    private array $catalogByStackId = [];

    /**
     * @param  Collection<int, Stack>  $stacks
     * @return list<array<string, mixed>>
     */
    public function resolveForResult(SystemResult $result, Collection $stacks): array
    {
        $result->loadMissing(['attack', 'attackDispatch']);
        $this->warmCatalog($stacks);

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
    private function warmCatalog(Collection $stacks): void
    {
        $missingIds = $stacks
            ->pluck('id')
            ->filter(fn (string $id): bool => ! array_key_exists($id, $this->catalogByStackId))
            ->values()
            ->all();

        if ($missingIds === []) {
            return;
        }

        foreach ($missingIds as $stackId) {
            $this->catalogByStackId[$stackId] = collect();
        }

        Remediation::query()
            ->whereIn('stack_id', $missingIds)
            ->get()
            ->each(function (Remediation $remediation): void {
                $this->catalogByStackId[$remediation->stack_id]->push($remediation);
            });
    }

    private function findRemediation(SystemResult $result, Stack $stack): ?Remediation
    {
        $catalog = $this->catalogByStackId[$stack->id] ?? collect();
        $scanType = $result->attackDispatch?->scan_type;
        $category = $result->attack?->category;

        if ($scanType === AttackScanType::Sast && filled($result->payload_used)) {
            $byRule = $catalog->first(
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

        return $catalog->first(function (Remediation $remediation) use ($category, $scanType): bool {
            if ($remediation->attack_category !== $category) {
                return false;
            }

            if ($remediation->semgrep_rule_id !== null) {
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
