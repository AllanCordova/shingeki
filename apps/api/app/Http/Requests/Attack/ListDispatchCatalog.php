<?php

namespace App\Http\Requests\Attack;

use App\Enums\Attack\AttackScanType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListDispatchCatalog extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (! $this->filled('scan_type')) {
            $this->merge(['scan_type' => AttackScanType::Dast->value]);
        }
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'scan_type' => ['required', Rule::enum(AttackScanType::class)],
        ];
    }

    public function scanType(): AttackScanType
    {
        return $this->enum('scan_type', AttackScanType::class) ?? AttackScanType::Dast;
    }
}
