<?php

namespace App\Http\Requests\System;

use App\Http\Requests\Concerns\ValidatesCoverSelection;
use App\Http\Requests\Concerns\ValidatesTargetUrl;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class SystemCreate extends FormRequest
{
    use ValidatesCoverSelection;
    use ValidatesTargetUrl;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->prepareLoginUrl();
        $this->normalizeStackIds();
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            ...$this->coverCreateRules(),
            'name' => ['required', 'string', 'max:255'],
            'target_url' => $this->browserTargetUrlRules(),
            'login_url' => $this->browserLoginUrlRules(),
            'repository_url' => ['required', 'url', 'max:2048'],
            'stack_ids' => ['sometimes', 'array'],
            'stack_ids.*' => ['uuid', 'exists:stacks,id'],
        ];
    }

    private function prepareLoginUrl(): void
    {
        if ($this->exists('login_url') && $this->input('login_url') === '') {
            $this->merge(['login_url' => null]);
        }
    }

    private function normalizeStackIds(): void
    {
        if (! $this->exists('stack_ids') || is_array($this->input('stack_ids'))) {
            return;
        }

        $this->merge(['stack_ids' => []]);
    }
}
