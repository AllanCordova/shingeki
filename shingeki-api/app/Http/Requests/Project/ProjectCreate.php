<?php

namespace App\Http\Requests\Project;

use App\Http\Requests\Concerns\ValidatesCoverSelection;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ProjectCreate extends FormRequest
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
            'description' => ['required', 'string'],
        ];
    }
}
