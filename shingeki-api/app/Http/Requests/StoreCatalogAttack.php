<?php

namespace App\Http\Requests;

use App\Enums\AttackCategory;
use App\Enums\AttackRiskLevel;
use App\Enums\AttackScanType;
use App\Enums\AttackTargetLocation;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCatalogAttack extends FormRequest
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
            'scan_type' => ['required', Rule::enum(AttackScanType::class)],
            'category' => ['required', Rule::enum(AttackCategory::class)],
            'target_location' => ['required', Rule::enum(AttackTargetLocation::class)],
            'risk_level' => ['required', Rule::enum(AttackRiskLevel::class)],
            'payload' => ['required', 'array'],
        ];
    }
}
