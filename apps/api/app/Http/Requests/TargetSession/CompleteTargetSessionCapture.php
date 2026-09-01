<?php

namespace App\Http\Requests\TargetSession;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class CompleteTargetSessionCapture extends FormRequest
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
            'cookie' => ['required_without_all:authorization,cookies', 'nullable', 'string', 'max:16384'],
            'authorization' => ['required_without_all:cookie,cookies', 'nullable', 'string', 'max:8192'],
            'user_agent' => ['sometimes', 'nullable', 'string', 'max:512'],
            'local_storage' => ['sometimes', 'nullable', 'array', 'max:50'],
            'local_storage.*' => ['string', 'max:8192'],
            'session_storage' => ['sometimes', 'nullable', 'array', 'max:50'],
            'session_storage.*' => ['string', 'max:8192'],
            'origins' => ['sometimes', 'nullable', 'array', 'max:10'],
            'origins.*.origin' => ['required', 'string', 'max:255'],
            'origins.*.local' => ['sometimes', 'nullable', 'array', 'max:50'],
            'origins.*.local.*' => ['string', 'max:8192'],
            'origins.*.session' => ['sometimes', 'nullable', 'array', 'max:50'],
            'origins.*.session.*' => ['string', 'max:8192'],
            'cookies' => ['required_without_all:cookie,authorization', 'nullable', 'array', 'max:80'],
            'cookies.*.name' => ['required', 'string', 'max:256'],
            'cookies.*.value' => ['required', 'string', 'max:4096'],
            'cookies.*.domain' => ['sometimes', 'nullable', 'string', 'max:255'],
            'cookies.*.path' => ['sometimes', 'nullable', 'string', 'max:255'],
            'cookies.*.secure' => ['sometimes', 'boolean'],
            'cookies.*.httpOnly' => ['sometimes', 'boolean'],
            'cookies.*.sameSite' => ['sometimes', 'nullable', 'string', 'max:32'],
            'cookies.*.hostOnly' => ['sometimes', 'boolean'],
            'cookies.*.session' => ['sometimes', 'boolean'],
            'cookies.*.expirationDate' => ['sometimes', 'nullable', 'numeric'],
            'cookies.*.partitionKey' => ['sometimes', 'nullable', 'array'],
            'cookies.*.partitionKey.topLevelSite' => ['sometimes', 'nullable', 'string', 'max:255'],
            'cookies.*.partitionKey.hasCrossSiteAncestor' => ['sometimes', 'boolean'],
            'routes' => ['sometimes', 'nullable', 'array', 'max:200'],
            'routes.*.method' => ['required', 'string', 'max:16'],
            'routes.*.url' => ['required', 'string', 'max:2048'],
            'routes.*.type' => ['sometimes', 'nullable', 'string', 'max:64'],
        ];
    }
};
