<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesCoverSelection;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class SystemCreate extends FormRequest
{
    use ValidatesCoverSelection;

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
            'target_url' => ['required', 'url', 'max:2048'],
            'repository_url' => ['required', 'url', 'max:2048'],
            'stack_ids' => ['required', 'array', 'min:1'],
            'stack_ids.*' => ['uuid', 'exists:stacks,id'],
        ];
    }
}
