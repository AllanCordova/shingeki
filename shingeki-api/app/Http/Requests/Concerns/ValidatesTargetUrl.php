<?php

namespace App\Http\Requests\Concerns;

use App\Services\Security\OutboundUrlGuard;
use Closure;
use InvalidArgumentException;

trait ValidatesTargetUrl
{
    /**
     * @return array<int, string|Closure>
     */
    protected function browserTargetUrlRules(bool $required = true): array
    {
        return [$required ? 'required' : 'sometimes', 'url', 'max:2048', $this->rejectDockerInternalHostnames(), $this->rejectUnsafeOutboundUrl()];
    }

    /**
     * @return array<int, string|Closure>
     */
    protected function browserLoginUrlRules(): array
    {
        return ['sometimes', 'nullable', 'url', 'max:2048', $this->rejectDockerInternalHostnames(), $this->rejectUnsafeOutboundUrl()];
    }

    private function rejectDockerInternalHostnames(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            if (! is_string($value) || $value === '') {
                return;
            }

            $host = parse_url($value, PHP_URL_HOST);
            if (! is_string($host)) {
                return;
            }

            $blocked = ['host.docker.internal', 'vulnerable-target'];
            if (in_array(strtolower($host), $blocked, true)) {
                $fail('Use localhost ou 127.0.0.1 para abrir no navegador. URLs internas do Docker sao resolvidas automaticamente para o worker.');
            }
        };
    }

    private function rejectUnsafeOutboundUrl(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            if (! is_string($value) || $value === '') {
                return;
            }

            try {
                app(OutboundUrlGuard::class)->assertSafe($value);
            } catch (InvalidArgumentException) {
                $fail('The :attribute host is not allowed.');
            }
        };
    }
}
