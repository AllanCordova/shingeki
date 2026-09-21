<?php

namespace App\Http\Requests\Concerns;

trait ValidatesScannerLogin
{
    protected function prepareScannerLogin(): void
    {
        $merge = [];

        foreach (['login_url', 'login_username', 'login_password', 'logged_in_indicator'] as $field) {
            if ($this->exists($field) && $this->input($field) === '') {
                $merge[$field] = null;
            }
        }

        if ($merge !== []) {
            $this->merge($merge);
        }
    }

    /**
     * @return array<string, mixed>
     */
    protected function scannerLoginRules(): array
    {
        return [
            'login_username' => ['sometimes', 'nullable', 'string', 'max:255'],
            'login_password' => ['sometimes', 'nullable', 'string', 'max:255'],
            'logged_in_indicator' => ['sometimes', 'nullable', 'string', 'max:255'],
        ];
    }
}
