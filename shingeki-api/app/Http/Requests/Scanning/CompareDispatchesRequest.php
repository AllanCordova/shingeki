<?php

namespace App\Http\Requests\Scanning;

use Illuminate\Foundation\Http\FormRequest;

class CompareDispatchesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'baseline_id' => ['required', 'uuid'],
            'target_id' => ['required', 'uuid', 'different:baseline_id'],
        ];
    }

    public function baselineId(): string
    {
        return (string) $this->validated('baseline_id');
    }

    public function targetId(): string
    {
        return (string) $this->validated('target_id');
    }
}
