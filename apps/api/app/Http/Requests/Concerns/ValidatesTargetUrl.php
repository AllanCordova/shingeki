<?php

namespace App\Http\Requests\Concerns;

use App\Models\System\System;
use App\Support\CaptureUrlPolicy;
use Closure;

trait ValidatesTargetUrl
{
    /**
     * @return array<int, string|Closure>
     */
    protected function browserTargetUrlRules(bool $required = true): array
    {
        return [$required ? 'required' : 'sometimes', 'url', 'max:2048', $this->rejectDisallowedCaptureHost()];
    }

    /**
     * @return array<int, string|Closure>
     */
    protected function browserLoginUrlRules(): array
    {
        return [
            'sometimes',
            'nullable',
            'url',
            'max:2048',
            $this->rejectDisallowedCaptureHost(),
            $this->loginUrlMustMatchTarget(),
        ];
    }

    private function rejectDisallowedCaptureHost(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            if (! is_string($value) || $value === '') {
                return;
            }

            $host = CaptureUrlPolicy::host($value);
            if ($host === null || ! CaptureUrlPolicy::isDisallowedHost($host)) {
                return;
            }

            if (in_array($host, ['host.docker.internal', 'vulnerable-target'], true)) {
                $fail('Use localhost ou 127.0.0.1 para abrir no navegador. URLs internas do Docker sao resolvidas automaticamente para o worker.');

                return;
            }

            $fail('Esta URL aponta para um host interno que o navegador de captura não pode abrir.');
        };
    }

    private function loginUrlMustMatchTarget(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            if (! is_string($value) || $value === '') {
                return;
            }

            $target = $this->input('target_url');
            if (! is_string($target) || $target === '') {
                $system = $this->route('system');
                $target = $system instanceof System ? (string) $system->target_url : '';
            }

            if ($target === '' || ! CaptureUrlPolicy::hostInScope($target, $value)) {
                $fail('A página de login precisa estar no mesmo host do alvo.');
            }
        };
    }
}
