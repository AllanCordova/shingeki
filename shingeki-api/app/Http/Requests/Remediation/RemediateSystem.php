<?php

namespace App\Http\Requests\Remediation;

use App\Http\Requests\Concerns\PaginatedListRequest;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class RemediateSystem extends FormRequest
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
            ...$this->pageRules(),
        ];
    }
}
