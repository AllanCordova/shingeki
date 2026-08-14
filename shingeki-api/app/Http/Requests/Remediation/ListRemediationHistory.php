<?php

namespace App\Http\Requests\Remediation;

use App\Http\Requests\Concerns\PaginatedListRequest;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

class ListRemediationHistory extends FormRequest
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
            'from' => ['sometimes', 'date'],
            'to' => ['sometimes', 'date', 'after_or_equal:from'],
            'type' => ['sometimes', 'nullable', 'string', Rule::in([
                'catalog_suggestion',
                'ai_suggestion',
                'attack',
                'github_pr',
            ])],
        ];
    }

    public function fromDate(): ?Carbon
    {
        $value = $this->validated('from');

        return $value ? Carbon::parse($value)->startOfDay() : null;
    }

    public function toDate(): ?Carbon
    {
        $value = $this->validated('to');

        return $value ? Carbon::parse($value)->endOfDay() : null;
    }

    public function eventType(): ?string
    {
        $value = $this->validated('type');

        return is_string($value) && $value !== '' ? $value : null;
    }
}
