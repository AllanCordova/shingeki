<?php

namespace Database\Seeders;

use App\Enums\System\StackKind;
use App\Models\System\Stack;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class StackCatalogSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * @var list<array{slug: string, name: string, kind: string, languages: list<string>}>
     */
    public const STACKS = [
        ['slug' => 'generic', 'name' => 'Genérica', 'kind' => 'generic', 'languages' => []],

        ['slug' => 'vanilla_php', 'name' => 'PHP', 'kind' => 'language', 'languages' => ['php']],
        ['slug' => 'javascript', 'name' => 'JavaScript', 'kind' => 'language', 'languages' => ['javascript']],
        ['slug' => 'typescript', 'name' => 'TypeScript', 'kind' => 'language', 'languages' => ['typescript']],
        ['slug' => 'python', 'name' => 'Python', 'kind' => 'language', 'languages' => ['python']],
        ['slug' => 'ruby', 'name' => 'Ruby', 'kind' => 'language', 'languages' => ['ruby']],
        ['slug' => 'java', 'name' => 'Java', 'kind' => 'language', 'languages' => ['java']],
        ['slug' => 'csharp', 'name' => 'C#', 'kind' => 'language', 'languages' => ['csharp']],
        ['slug' => 'go', 'name' => 'Go', 'kind' => 'language', 'languages' => ['go']],
        ['slug' => 'kotlin', 'name' => 'Kotlin', 'kind' => 'language', 'languages' => ['kotlin']],
        ['slug' => 'elixir', 'name' => 'Elixir', 'kind' => 'language', 'languages' => ['elixir']],

        ['slug' => 'laravel', 'name' => 'Laravel', 'kind' => 'framework', 'languages' => ['php']],
        ['slug' => 'symfony', 'name' => 'Symfony', 'kind' => 'framework', 'languages' => ['php']],
        ['slug' => 'codeigniter', 'name' => 'CodeIgniter', 'kind' => 'framework', 'languages' => ['php']],
        ['slug' => 'cakephp', 'name' => 'CakePHP', 'kind' => 'framework', 'languages' => ['php']],
        ['slug' => 'wordpress', 'name' => 'WordPress', 'kind' => 'framework', 'languages' => ['php']],
        ['slug' => 'livewire', 'name' => 'Livewire', 'kind' => 'framework', 'languages' => ['php']],
        ['slug' => 'express', 'name' => 'Express', 'kind' => 'framework', 'languages' => ['javascript']],
        ['slug' => 'nestjs', 'name' => 'NestJS', 'kind' => 'framework', 'languages' => ['typescript', 'javascript']],
        ['slug' => 'fastify', 'name' => 'Fastify', 'kind' => 'framework', 'languages' => ['javascript', 'typescript']],
        ['slug' => 'hono', 'name' => 'Hono', 'kind' => 'framework', 'languages' => ['javascript', 'typescript']],
        ['slug' => 'react', 'name' => 'React', 'kind' => 'framework', 'languages' => ['typescript', 'javascript']],
        ['slug' => 'nextjs', 'name' => 'Next.js', 'kind' => 'framework', 'languages' => ['typescript', 'javascript']],
        ['slug' => 'angular', 'name' => 'Angular', 'kind' => 'framework', 'languages' => ['typescript', 'javascript']],
        ['slug' => 'vue', 'name' => 'Vue', 'kind' => 'framework', 'languages' => ['javascript', 'typescript']],
        ['slug' => 'nuxt', 'name' => 'Nuxt', 'kind' => 'framework', 'languages' => ['javascript', 'typescript']],
        ['slug' => 'svelte', 'name' => 'Svelte', 'kind' => 'framework', 'languages' => ['javascript', 'typescript']],
        ['slug' => 'sveltekit', 'name' => 'SvelteKit', 'kind' => 'framework', 'languages' => ['javascript', 'typescript']],
        ['slug' => 'remix', 'name' => 'Remix', 'kind' => 'framework', 'languages' => ['javascript', 'typescript']],
        ['slug' => 'astro', 'name' => 'Astro', 'kind' => 'framework', 'languages' => ['javascript', 'typescript']],
        ['slug' => 'htmx', 'name' => 'htmx', 'kind' => 'framework', 'languages' => ['javascript']],
        ['slug' => 'django', 'name' => 'Django', 'kind' => 'framework', 'languages' => ['python']],
        ['slug' => 'flask', 'name' => 'Flask', 'kind' => 'framework', 'languages' => ['python']],
        ['slug' => 'fastapi', 'name' => 'FastAPI', 'kind' => 'framework', 'languages' => ['python']],
        ['slug' => 'rails', 'name' => 'Ruby on Rails', 'kind' => 'framework', 'languages' => ['ruby']],
        ['slug' => 'spring', 'name' => 'Spring Boot', 'kind' => 'framework', 'languages' => ['java']],
        ['slug' => 'ktor', 'name' => 'Ktor', 'kind' => 'framework', 'languages' => ['kotlin']],
        ['slug' => 'aspnet', 'name' => 'ASP.NET', 'kind' => 'framework', 'languages' => ['csharp']],
        ['slug' => 'blazor', 'name' => 'Blazor', 'kind' => 'framework', 'languages' => ['csharp']],
        ['slug' => 'gin', 'name' => 'Gin', 'kind' => 'framework', 'languages' => ['go']],
        ['slug' => 'phoenix', 'name' => 'Phoenix', 'kind' => 'framework', 'languages' => ['elixir']],
    ];

    public function run(): void
    {
        foreach (self::STACKS as $definition) {
            Stack::query()->updateOrCreate(
                ['slug' => $definition['slug']],
                [
                    'name' => $definition['name'],
                    'kind' => StackKind::from($definition['kind']),
                    'languages' => $definition['languages'],
                ],
            );
        }
    }
}
