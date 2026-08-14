<?php

namespace App\Http\Requests\Workspace;

use App\Http\Requests\Concerns\ValidatesCoverSelection;
use App\Http\Requests\Concerns\ValidatesTargetUrl;
use App\Http\Requests\Workspace\Concerns\ValidatesGitHubRepositoryUrl;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class SystemCreate extends FormRequest
{
    use ValidatesCoverSelection;
    use ValidatesGitHubRepositoryUrl;
    use ValidatesTargetUrl;

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
            ...$this->coverCreateRules(),
            'name' => ['required', 'string', 'max:255'],
            'target_url' => $this->browserTargetUrlRules(),
            'login_url' => $this->browserLoginUrlRules(),
            'repository_url' => $this->githubRepositoryUrlRules(required: true),
            'stack_ids' => ['required', 'array', 'min:1'],
            'stack_ids.*' => ['uuid', 'exists:stacks,id'],
        ];
    }
}
