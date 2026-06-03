<?php

namespace App\Http\Requests\Concerns;

use Illuminate\Validation\Rule;

trait ValidatesCoverSelection
{
    /**
     * @return array<string, mixed>
     */
    protected function coverCreateRules(): array
    {
        return [
            'cover' => [
                'nullable',
                'prohibits:cover_upload_id',
                'image',
                'max:5120',
            ],
            'cover_upload_id' => [
                'nullable',
                'prohibits:cover',
                'uuid',
                Rule::exists('user_cover_uploads', 'id')->where(
                    fn ($query) => $query->where('user_id', $this->user()?->id),
                ),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function coverUpdateRules(): array
    {
        return [
            'cover' => [
                'sometimes',
                'prohibits:cover_upload_id',
                'nullable',
                'image',
                'max:5120',
            ],
            'cover_upload_id' => [
                'sometimes',
                'prohibits:cover',
                'nullable',
                'uuid',
                Rule::exists('user_cover_uploads', 'id')->where(
                    fn ($query) => $query->where('user_id', $this->user()?->id),
                ),
            ],
        ];
    }
}
