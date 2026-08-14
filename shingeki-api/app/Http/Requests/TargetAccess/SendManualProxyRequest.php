<?php

namespace App\Http\Requests\TargetAccess;

use App\Enums\Catalog\AttackTargetLocation;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SendManualProxyRequest extends FormRequest
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
            'method' => ['required', 'string', Rule::in(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])],
            'path' => ['required', 'string', 'starts_with:/', 'max:2048'],
            'query' => ['sometimes', 'array'],
            'query.*' => ['string', 'max:4096'],
            'headers' => ['sometimes', 'array'],
            'headers.*' => ['string', 'max:8192'],
            'body' => ['sometimes', 'nullable', 'string', 'max:65536'],
            'content_type' => ['sometimes', 'nullable', 'string', 'max:255'],
            'use_target_session' => ['sometimes', 'boolean'],
            'payload' => ['sometimes', 'nullable', 'array'],
            'payload.target_location' => ['required_with:payload', Rule::enum(AttackTargetLocation::class)],
            'payload.field' => ['sometimes', 'nullable', 'string', 'max:255'],
            'payload.value' => ['sometimes', 'nullable', 'string', 'max:8192'],
        ];
    }

    public function useTargetSession(): bool
    {
        return $this->boolean('use_target_session', true);
    }

    /**
     * @return array<string, string>
     */
    public function queryParams(): array
    {
        return $this->validated('query', []);
    }

    /**
     * @return array<string, string>
     */
    public function headerParams(): array
    {
        return $this->validated('headers', []);
    }

    /**
     * @return array{target_location?: string, field?: string, value?: string}|null
     */
    public function payloadParams(): ?array
    {
        $payload = $this->validated('payload');

        return is_array($payload) ? $payload : null;
    }
}
