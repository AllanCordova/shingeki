<?php

namespace App\Http\Requests\Concerns;

trait CatalogListRequest
{
    use PaginatedListRequest;

    /**
     * @return array<string, array<int, string>>
     */
    protected function catalogListRules(): array
    {
        return [
            ...$this->pageRules(),
            'user_id' => ['sometimes', 'nullable', 'uuid', 'exists:users,id'],
        ];
    }

    public function ownerUserId(): ?string
    {
        $userId = $this->validated('user_id');

        return is_string($userId) && $userId !== '' ? $userId : null;
    }
}
