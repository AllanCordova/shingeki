<?php

namespace App\Http\Requests;

use App\Enums\AttackCategory;
use App\Enums\AttackScanType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCatalogRemediation extends FormRequest
{
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
            'stack_id' => ['sometimes', 'required', 'uuid', 'exists:stacks,id'],
            'scan_type' => ['nullable', Rule::enum(AttackScanType::class)],
            'attack_category' => ['nullable', Rule::enum(AttackCategory::class)],
            'semgrep_rule_id' => ['nullable', 'string', 'max:255'],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'required', 'string'],
            'code_snippet' => ['sometimes', 'required', 'string'],
            'references' => ['nullable', 'array'],
            'references.*' => ['string', 'url'],
        ];
    }
}
