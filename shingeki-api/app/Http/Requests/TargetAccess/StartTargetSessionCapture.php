<?php

namespace App\Http\Requests\TargetAccess;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StartTargetSessionCapture extends FormRequest
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
            'client_origin' => ['required', 'url', 'max:2048'],
        ];
    }
}
