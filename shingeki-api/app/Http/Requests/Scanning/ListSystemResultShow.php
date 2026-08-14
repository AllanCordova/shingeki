<?php

namespace App\Http\Requests\Scanning;

use App\Enums\Scanning\DispatchProbeListFilter;
use App\Http\Requests\Concerns\PaginatedListRequest;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListSystemResultShow extends FormRequest
{
    use PaginatedListRequest;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            ...$this->pageRules(),
            'results_page' => ['sometimes', 'integer', 'min:1'],
            'results_per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'filter' => ['sometimes', Rule::enum(DispatchProbeListFilter::class)],
            'category' => ['sometimes', 'string', 'max:64'],
            'risk_level' => ['sometimes', 'string', Rule::in(['LOW', 'MEDIUM', 'HIGH'])],
            'route' => ['sometimes', 'string', 'max:2048'],
            'q' => ['sometimes', 'string', 'max:255'],
        ];
    }

    public function resultsPage(): int
    {
        return max(1, (int) $this->validated('results_page', 1));
    }

    public function resultsPerPage(): int
    {
        return min(100, max(1, (int) $this->validated('results_per_page', 25)));
    }

    public function filter(): DispatchProbeListFilter
    {
        $filter = $this->validated('filter');

        if ($filter instanceof DispatchProbeListFilter) {
            return $filter;
        }

        if (is_string($filter)) {
            return DispatchProbeListFilter::from($filter);
        }

        return DispatchProbeListFilter::All;
    }

    public function category(): ?string
    {
        $value = $this->validated('category');

        return is_string($value) && $value !== '' ? $value : null;
    }

    public function riskLevel(): ?string
    {
        $value = $this->validated('risk_level');

        return is_string($value) && $value !== '' ? $value : null;
    }

    public function routeQuery(): ?string
    {
        $value = $this->validated('route');

        return is_string($value) && $value !== '' ? $value : null;
    }

    public function searchQuery(): ?string
    {
        $value = $this->validated('q');

        return is_string($value) && $value !== '' ? $value : null;
    }

    /**
     * @return array<string, string|null>
     */
    public function logFilters(): array
    {
        return [
            'category' => $this->category(),
            'risk_level' => $this->riskLevel(),
            'route' => $this->routeQuery(),
            'q' => $this->searchQuery(),
        ];
    }
}
