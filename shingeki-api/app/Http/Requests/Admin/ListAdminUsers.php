<?php

namespace App\Http\Requests\Admin;

use App\Enums\User\UserRole;
use App\Http\Requests\Concerns\PaginatedListRequest;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListAdminUsers extends FormRequest
{
    use PaginatedListRequest;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            ...$this->pageRules(),
            'search' => ['sometimes', 'nullable', 'string', 'max:255'],
            'role' => ['sometimes', 'nullable', 'string', Rule::enum(UserRole::class)],
        ];
    }

    public function search(): ?string
    {
        $value = $this->validated('search');

        return is_string($value) ? trim($value) : null;
    }

    public function role(): ?UserRole
    {
        $value = $this->validated('role');

        return is_string($value) && $value !== '' ? UserRole::from($value) : null;
    }
}
