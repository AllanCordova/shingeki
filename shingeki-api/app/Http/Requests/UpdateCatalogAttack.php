<?php

namespace App\Http\Requests;

use App\Enums\AttackCategory;
use App\Enums\AttackRiskLevel;
use App\Enums\AttackScanType;
use App\Enums\AttackTargetLocation;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCatalogAttack extends FormRequest
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
            'scan_type' => ['sometimes', 'required', Rule::enum(AttackScanType::class)],
            'category' => ['sometimes', 'required', Rule::enum(AttackCategory::class)],
            'target_location' => ['sometimes', 'required', Rule::enum(AttackTargetLocation::class)],
            'risk_level' => ['sometimes', 'required', Rule::enum(AttackRiskLevel::class)],
            'payload' => ['sometimes', 'required', 'array'],
        ];
    }
}
