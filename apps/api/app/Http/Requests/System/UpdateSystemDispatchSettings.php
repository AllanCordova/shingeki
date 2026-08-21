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
}
