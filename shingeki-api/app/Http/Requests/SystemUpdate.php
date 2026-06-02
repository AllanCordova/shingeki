<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesCoverSelection;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class SystemUpdate extends FormRequest
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
            ...$this->coverUpdateRules(),
            'name' => ['sometimes', 'string', 'max:255'],
            'target_url' => ['sometimes', 'url', 'max:2048'],
            'repository_url' => ['sometimes', 'url', 'max:2048'],
        ];
    }
}
