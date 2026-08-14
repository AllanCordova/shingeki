<?php

namespace App\Http\Requests\Workspace\Concerns;

use App\Services\Remediation\Source\GitHubRepositoryResolver;
use Closure;

trait ValidatesGitHubRepositoryUrl
{
    /**
     * @return array<int, mixed>
     */
    protected function githubRepositoryUrlRules(bool $required = true): array
    {
        return [
            $required ? 'required' : 'sometimes',
            'url',
            'max:2048',
            function (string $attribute, mixed $value, Closure $fail): void {
                if (! is_string($value) || $value === '') {
                    return;
                }

                if (app(GitHubRepositoryResolver::class)->parse($value) === null) {
                    $fail('The :attribute must be an https GitHub repository URL.');
                }
            },
        ];
    }
}
