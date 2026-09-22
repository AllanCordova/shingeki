<?php

namespace App\Http\Requests\System;

use App\Http\Requests\Concerns\ValidatesCoverSelection;
use App\Http\Requests\Concerns\ValidatesScannerLogin;
use App\Http\Requests\Concerns\ValidatesTargetUrl;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class SystemCreate extends FormRequest
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
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            ...$this->coverCreateRules(),
            ...$this->scannerLoginRules(),
            'name' => ['required', 'string', 'max:255'],
            'target_url' => $this->browserTargetUrlRules(),
            'login_url' => $this->browserLoginUrlRules(),
            'repository_url' => ['required', 'url', 'max:2048'],
            'stack_ids' => ['required', 'array', 'min:1'],
            'stack_ids.*' => ['uuid', 'exists:stacks,id'],
        ];
    }
}
