<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\CatalogListRequest;
use Illuminate\Foundation\Http\FormRequest;

class ListCatalogItems extends FormRequest
{
    use CatalogListRequest;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return $this->catalogListRules();
    }
}
