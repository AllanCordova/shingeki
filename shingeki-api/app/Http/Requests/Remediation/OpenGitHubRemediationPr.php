<?php

namespace App\Http\Requests\Remediation;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class OpenGitHubRemediationPr extends FormRequest
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
            'dispatch_id' => ['sometimes', 'uuid'],
            'finding_ids' => ['required', 'array', 'min:1', 'max:10'],
            'finding_ids.*' => ['uuid'],
            'regenerate' => ['sometimes', 'boolean'],
            'title' => ['sometimes', 'string', 'max:255'],
            'base_branch' => ['sometimes', 'string', 'max:255'],
        ];
    }
}
