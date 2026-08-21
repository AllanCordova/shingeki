<?php

namespace App\Http\Requests\Auth;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class AuthUpdate extends FormRequest
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
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'string', 'email', 'max:255', 'unique:users,email,'.$this->user()?->id],
            'password' => ['sometimes', 'nullable', 'string', 'confirmed', Password::min(8)],
            'current_password' => ['required_with:password', 'string', 'current_password'],
            'avatar' => [
                'sometimes',
                'prohibits:avatar_upload_id',
                'nullable',
                'image',
                'max:5120',
            ],
            'avatar_upload_id' => [
                'sometimes',
                'prohibits:avatar',
                'nullable',
                'uuid',
                Rule::exists('user_cover_uploads', 'id')->where(
                    fn ($query) => $query->where('user_id', $this->user()?->id),
                ),
            ],
            'remove_avatar' => ['sometimes', 'boolean'],
        ];
    }
}
