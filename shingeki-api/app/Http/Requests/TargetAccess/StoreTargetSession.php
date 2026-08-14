<?php

namespace App\Http\Requests\TargetAccess;

use App\Enums\TargetAccess\TargetAuthType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTargetSession extends FormRequest
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
            'auth_type' => ['required', Rule::enum(TargetAuthType::class)],
            'credential' => ['required', 'string', 'min:1', 'max:8192'],
            'expires_at' => ['sometimes', 'nullable', 'date', 'after:now'],
        ];
    }
}
