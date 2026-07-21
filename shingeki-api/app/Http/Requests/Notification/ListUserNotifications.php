<?php

namespace App\Http\Requests\Notification;

use App\Http\Requests\Concerns\PaginatedListRequest;
use Illuminate\Foundation\Http\FormRequest;

class ListUserNotifications extends FormRequest
{
    use PaginatedListRequest;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return $this->pageRules();
    }
}
