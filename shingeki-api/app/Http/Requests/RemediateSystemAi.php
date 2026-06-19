<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\PaginatedListRequest;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class RemediateSystemAi extends FormRequest
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
            'dispatch_id' => ['sometimes', 'uuid'],
            'finding_ids' => ['sometimes', 'array', 'max:10'],
            'finding_ids.*' => ['uuid'],
            'regenerate' => ['sometimes', 'boolean'],
            ...$this->pageRules(),
        ];
    }
}
