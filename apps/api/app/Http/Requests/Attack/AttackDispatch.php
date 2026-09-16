<?php

namespace App\Http\Requests\Attack;

use App\Enums\Attack\AttackDepth;
use App\Support\AttackAcknowledgmentTerms;
use App\Support\DiscoveryStartPath;
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
            'attack_ids' => ['sometimes', 'array', 'min:1'],
            'attack_ids.*' => ['required', 'uuid'],
            'depth' => ['nullable', Rule::enum(AttackDepth::class)],
            'start_path' => ['nullable', 'string', 'max:2048'],
            'max_routes' => ['nullable', 'integer', 'min:1', 'max:500'],
        ];
    }

    /**
     * @return list<string>|null
     */
    public function attackIds(): ?array
    {
        if (! $this->exists('attack_ids')) {
            return null;
        }

        /** @var list<string> $ids */
        $ids = $this->validated('attack_ids');

        return array_values($ids);
    }

    public function attackDepth(): AttackDepth
    {
        return $this->enum('depth', AttackDepth::class) ?? AttackDepth::Full;
    }

    public function startPath(): ?string
    {
        $value = $this->validated()['start_path'] ?? null;

        return DiscoveryStartPath::normalize(is_string($value) ? $value : null);
    }

    public function maxRoutes(): ?int
    {
        $value = $this->validated('max_routes');
        if ($value === null) {
            return null;
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
            'attack_ids.min' => 'Select at least one catalog attack.',
            'attack_ids.*.uuid' => 'Each attack id must be a valid UUID.',
            'depth.enum' => 'Depth must be quick or full.',
            'max_routes.min' => 'Max routes must be at least 1.',
            'max_routes.max' => 'Max routes cannot exceed 500.',
        ];
    }
}
