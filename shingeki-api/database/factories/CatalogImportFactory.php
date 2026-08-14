<?php

namespace Database\Factories;

use App\Enums\Catalog\CatalogImportStatus;
use App\Enums\Catalog\CatalogImportType;
use App\Models\Catalog\CatalogImport;
use App\Models\Identity\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CatalogImport>
 */
class CatalogImportFactory extends Factory
{
    protected $model = CatalogImport::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'type' => CatalogImportType::Attacks,
            'status' => CatalogImportStatus::Pending,
            'total_rows' => 1,
            'processed_rows' => 0,
            'success_count' => 0,
            'failed_count' => 0,
        ];
    }
}
