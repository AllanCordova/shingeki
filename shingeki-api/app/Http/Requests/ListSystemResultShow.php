<?php

namespace App\Http\Requests;

use App\Enums\DispatchProbeListFilter;
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
}
