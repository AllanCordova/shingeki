<?php

namespace App\Http\Requests\System;

use App\Http\Requests\Concerns\ValidatesCoverSelection;
use App\Http\Requests\Concerns\ValidatesScannerLogin;
use App\Http\Requests\Concerns\ValidatesTargetUrl;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class SystemUpdate extends FormRequest
{
    use ValidatesCoverSelection;
    use ValidatesScannerLogin;
    use ValidatesTargetUrl;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->prepareScannerLogin();
        $this->normalizeStackIds();
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            ...$this->coverUpdateRules(),
            ...$this->scannerLoginRules(),
            'name' => ['sometimes', 'string', 'max:255'],
            'target_url' => $this->browserTargetUrlRules(required: false),
            'login_url' => $this->browserLoginUrlRules(),
            'repository_url' => ['sometimes', 'url', 'max:2048'],
            'dast_max_routes' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:500'],
            'stack_ids' => ['sometimes', 'array'],
            'stack_ids.*' => ['uuid', 'exists:stacks,id'],
        ];
    }

    private function normalizeStackIds(): void
    {
        if (! $this->exists('stack_ids') || is_array($this->input('stack_ids'))) {
            return;
        }

        $this->merge(['stack_ids' => []]);
    }
}
