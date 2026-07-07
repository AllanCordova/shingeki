<?php

namespace App\Services\CatalogImport;

use App\Enums\AttackCategory;
use App\Enums\AttackScanType;
use App\Models\Stack;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class CatalogRemediationRowValidator
{
    /**
     * @var array<string, string>|null
     */
    private ?array $stackIdsBySlug = null;

    /**
     * @param  array<string, string>  $row
     * @return array{data: array<string, mixed>|null, errors: list<string>}
     */
    public function validate(array $row): array
    {
        $stackSlug = $row['stack_slug'] ?? '';
        $stackId = $this->stackIdsBySlug()[$stackSlug] ?? null;

        $references = array_values(array_filter(array_map(
            static fn (string $part): string => trim($part),
            preg_split('/[\|;,]/', $row['references'] ?? '') ?: [],
        )));

        $validator = Validator::make([
            'stack_slug' => $stackSlug,
            'stack_id' => $stackId,
            'scan_type' => $this->nullableValue($row['scan_type'] ?? ''),
            'attack_category' => $this->nullableValue($row['attack_category'] ?? ''),
            'semgrep_rule_id' => $this->nullableValue($row['semgrep_rule_id'] ?? ''),
            'title' => $row['title'] ?? '',
            'description' => $row['description'] ?? '',
            'code_snippet' => $this->normalizeMultiline($row['code_snippet'] ?? ''),
            'references' => $references === [] ? null : $references,
        ], [
            'stack_slug' => ['required', 'string'],
            'stack_id' => ['required', 'uuid'],
            'scan_type' => ['nullable', Rule::enum(AttackScanType::class)],
            'attack_category' => ['nullable', Rule::enum(AttackCategory::class)],
            'semgrep_rule_id' => ['nullable', 'string', 'max:255'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'code_snippet' => ['required', 'string'],
            'references' => ['nullable', 'array'],
            'references.*' => ['url'],
        ]);

        if ($stackSlug !== '' && $stackId === null) {
            $validator->errors()->add('stack_slug', "Unknown stack slug [{$stackSlug}].");
        }

        if ($validator->fails()) {
            return [
                'data' => null,
                'errors' => collect($validator->errors()->all())->values()->all(),
            ];
        }

        /** @var array<string, mixed> $validated */
        $validated = $validator->validated();
        unset($validated['stack_slug']);

        return [
            'data' => $validated,
            'errors' => [],
        ];
    }

    private function nullableValue(string $value): ?string
    {
        $value = trim($value);

        return $value === '' ? null : $value;
    }

    private function normalizeMultiline(string $value): string
    {
        return str_replace(['\\r\\n', '\\n', '\\t'], ["\n", "\n", "\t"], $value);
    }

    /**
     * @return array<string, string>
     */
    private function stackIdsBySlug(): array
    {
        if ($this->stackIdsBySlug !== null) {
            return $this->stackIdsBySlug;
        }

        $this->stackIdsBySlug = Stack::query()
            ->pluck('id', 'slug')
            ->all();

        return $this->stackIdsBySlug;
    }
}
