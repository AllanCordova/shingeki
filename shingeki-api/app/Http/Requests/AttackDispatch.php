<?php

namespace App\Http\Requests;

use App\Enums\AttackDepth;
use App\Support\AttackAcknowledgmentTerms;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AttackDispatch extends FormRequest
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
            'accepted_responsibility' => ['required', 'accepted'],
            'accepted_legal_terms' => ['required', 'accepted'],
            'terms_version' => ['required', 'string', Rule::in([AttackAcknowledgmentTerms::VERSION])],
            'depth' => ['nullable', Rule::enum(AttackDepth::class)],
            'start_path' => ['nullable', 'string', 'max:2048'],
            'max_routes' => ['nullable', 'integer', 'min:1', 'max:500'],
        ];
    }

    public function attackDepth(): AttackDepth
    {
        return $this->enum('depth', AttackDepth::class) ?? AttackDepth::Full;
    }

    public function startPath(): ?string
    {
        $value = $this->validated('start_path');
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        $path = trim($value);
        $path = str_replace('\\', '/', $path);

        if (preg_match('#^https?://#i', $path) === 1) {
            $parts = parse_url($path);
            $path = ($parts['path'] ?? '/')
                .(isset($parts['query']) ? '?'.$parts['query'] : '');
        }

        if (($hashPos = strpos($path, '#')) !== false) {
            $path = substr($path, 0, $hashPos);
        }

        $path = preg_replace('#/+#', '/', $path) ?? '/';

        if ($path === '' || $path === false) {
            $path = '/';
        }

        if (! str_starts_with($path, '/')) {
            $path = '/'.$path;
        }

        return $path;
    }

    public function maxRoutes(): ?int
    {
        $value = $this->validated('max_routes');
        if ($value === null) {
            return $this->startPath() !== null ? 50 : null;
        }

        return (int) $value;
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'accepted_responsibility.accepted' => 'You must accept responsibility for authorized testing.',
            'accepted_legal_terms.accepted' => 'You must accept the attack authorization terms.',
            'terms_version.in' => 'Acknowledgment terms version is outdated. Refresh and try again.',
            'depth.enum' => 'Depth must be quick or full.',
            'max_routes.min' => 'Max routes must be at least 1.',
            'max_routes.max' => 'Max routes cannot exceed 500.',
        ];
    }
}
