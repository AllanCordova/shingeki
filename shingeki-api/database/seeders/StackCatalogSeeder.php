<?php

namespace Database\Seeders;

use App\Models\Stack;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class StackCatalogSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * @var list<array{slug: string, name: string, languages: list<string>}>
     */
    public const STACKS = [
        ['slug' => 'laravel', 'name' => 'Laravel', 'languages' => ['php']],
        ['slug' => 'vanilla_php', 'name' => 'PHP', 'languages' => ['php']],
        ['slug' => 'express', 'name' => 'Express', 'languages' => ['javascript']],
        ['slug' => 'react', 'name' => 'React', 'languages' => ['typescript', 'javascript']],
        ['slug' => 'nextjs', 'name' => 'Next.js', 'languages' => ['typescript', 'javascript']],
    ];

    public function run(): void
    {
        foreach (self::STACKS as $definition) {
            Stack::query()->firstOrCreate(
                ['slug' => $definition['slug']],
                [
                    'name' => $definition['name'],
                    'languages' => $definition['languages'],
                ],
            );
        }
    }
}
