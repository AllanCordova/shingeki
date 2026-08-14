<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $this->call(AttackCatalogSeeder::class);
        $this->call(StackCatalogSeeder::class);
        $this->call(RemediationCatalogSeeder::class);

        if (filter_var(env('DEMO_SEED', false), FILTER_VALIDATE_BOOL)) {
            $this->call(DemoEnvironmentSeeder::class);
        }
    }
}
