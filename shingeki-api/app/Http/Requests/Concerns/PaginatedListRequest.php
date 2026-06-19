<?php

namespace App\Http\Requests\Concerns;

trait PaginatedListRequest
{
    protected function pageRules(): array
    {
        return [
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ];
    }

    public function page(): int
    {
        return max(1, (int) $this->validated('page', 1));
    }

    public function perPage(): int
    {
        return min(100, max(1, (int) $this->validated('per_page', 25)));
    }
}
