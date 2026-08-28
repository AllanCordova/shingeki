<?php

namespace App\Http\Requests\System;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreManualRouteMapRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:120'],
            'method' => ['required', 'string', Rule::in(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])],
            'path' => ['required', 'string', 'starts_with:/', 'max:2048'],
            'query' => ['sometimes', 'nullable', 'array'],
            'query.*' => ['string', 'max:4096'],
            'headers' => ['sometimes', 'nullable', 'array'],
            'headers.*' => ['string', 'max:8192'],
            'body' => ['sometimes', 'nullable', 'string', 'max:65536'],
            'content_type' => ['sometimes', 'nullable', 'string', 'max:255'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }
}
