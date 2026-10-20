<?php

namespace App\Http\Requests\System;

use App\Http\Requests\Concerns\ValidatesCoverSelection;
use App\Http\Requests\Concerns\ValidatesTargetUrl;
use App\Models\System\System;
use App\Support\CaptureUrlPolicy;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class SystemUpdate extends FormRequest
{
    use ValidatesCoverSelection;
    use ValidatesTargetUrl;

    public function authorize(): bool
    {
        return true;
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $system = $this->route('system');
            if (! $system instanceof System || $this->exists('login_url')) {
                return;
            }

            $login = $system->login_url;
            if (! is_string($login) || $login === '' || ! $this->exists('target_url')) {
                return;
            }

            $target = $this->input('target_url');
            if (! is_string($target) || $target === '') {
                return;
            }

            if (! CaptureUrlPolicy::hostInScope($target, $login)) {
                $validator->errors()->add(
                    'login_url',
                    'A página de login precisa estar no mesmo host do alvo.',
                );
            }
        });
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
            ...$this->coverUpdateRules(),
            'name' => ['sometimes', 'string', 'max:255'],
            'target_url' => $this->browserTargetUrlRules(required: false),
            'login_url' => $this->browserLoginUrlRules(),
            'repository_url' => ['sometimes', 'url', 'max:2048'],
            'dast_max_routes' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:500'],
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
