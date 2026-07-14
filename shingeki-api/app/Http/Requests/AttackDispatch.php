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
        ];
    }

    public function attackDepth(): AttackDepth
    {
        return $this->enum('depth', AttackDepth::class) ?? AttackDepth::Full;
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
        ];
    }
}
