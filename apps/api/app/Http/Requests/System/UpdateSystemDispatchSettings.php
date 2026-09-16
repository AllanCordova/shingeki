<?php

namespace App\Http\Requests\System;

use App\Support\DiscoveryStartPath;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateSystemDispatchSettings extends FormRequest
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
            'dast_start_path' => ['present', 'nullable', 'string', 'max:2048'],
            'dast_max_routes' => ['present', 'nullable', 'integer', 'min:1', 'max:500'],
            'dast_attack_ids' => ['sometimes', 'nullable', 'array', 'min:1'],
            'dast_attack_ids.*' => ['uuid'],
            'sast_attack_ids' => ['sometimes', 'nullable', 'array', 'min:1'],
            'sast_attack_ids.*' => ['uuid'],
        ];
    }

    public function dastStartPath(): ?string
    {
        $value = $this->validated('dast_start_path');

        return DiscoveryStartPath::normalize(is_string($value) ? $value : null);
    }

    public function dastMaxRoutes(): ?int
    {
        $value = $this->validated('dast_max_routes');

        return $value === null ? null : (int) $value;
    }

    /**
     * @return list<string>|null
     */
    public function dastAttackIds(): ?array
    {
        return $this->normalizedAttackIds('dast_attack_ids');
    }

    /**
     * @return list<string>|null
     */
    public function sastAttackIds(): ?array
    {
        return $this->normalizedAttackIds('sast_attack_ids');
    }

    /**
     * @return list<string>|null
     */
    private function normalizedAttackIds(string $key): ?array
    {
        $value = $this->validated($key);

        if (! is_array($value) || $value === []) {
            return null;
        }

        return array_values($value);
    }
}
