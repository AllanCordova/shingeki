<?php

namespace Database\Seeders;

use App\Models\Project\Project;
use App\Models\System\Stack;
use App\Models\System\System;
use App\Models\User\User;
use Database\Seeders\Concerns\PublishesSeedCovers;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DemoProjectsSeeder extends Seeder
{
    use PublishesSeedCovers;
    use WithoutModelEvents;

    /**
     * @var list<string>
     */
    public const DEMO_USER_EMAILS = [
        'test@example.com',
        'admin@admin.com',
    ];

    public const PROJECT_NAME = 'Laboratório';

    /**
     * Projetos do seed antigo. Um novo seed apaga esses nomes em qualquer conta.
     *
     * @var list<string>
     */
    private const RETIRED_PROJECT_NAMES = [
        'Netflix',
        'Mercado Livre',
        'Nubank',
        'iFood',
        'Pentest Lab',
    ];

    /**
     * Alvos públicos feitos para teste de scanner. Já estão no ar.
     * O inventário esperado de cada um está em ScannerTargetExpectations.
     *
     * @var list<array{
     *     name: string,
     *     description: string,
     *     target_url: string,
     *     repository_url: string,
     *     login_url: string|null,
     *     stack: string,
     *     cover: string
     * }>
     */
    public const TARGETS = [
        [
            'name' => 'OWASP Juice Shop',
            'description' => 'Demonstração oficial do OWASP Juice Shop. Aplicação Node feita para ser atacada.',
            'target_url' => 'https://demo.owasp-juice.shop',
            'repository_url' => 'https://github.com/juice-shop/juice-shop',
            'login_url' => 'https://demo.owasp-juice.shop/#/login',
            'stack' => 'express',
            'cover' => 'juice-shop.jpg',
        ],
        [
            'name' => 'Google Firing Range',
            'description' => 'Firing Range do Google. Aplicação Java publicada para exercer ferramentas de segurança.',
            'target_url' => 'https://public-firing-range.appspot.com',
            'repository_url' => 'https://github.com/google/firing-range',
            'login_url' => null,
            'stack' => 'java',
            'cover' => 'firing-range.jpg',
        ],
        [
            'name' => 'Acunetix ASP.NET',
            'description' => 'Site de teste da Acunetix em ASP.NET, publicado para scanners. Não tem código-fonte público: o SAST não clona este alvo.',
            'target_url' => 'http://testaspnet.vulnweb.com',
            'repository_url' => 'http://testaspnet.vulnweb.com',
            'login_url' => 'http://testaspnet.vulnweb.com/login.aspx',
            'stack' => 'aspnet',
            'cover' => 'acunetix-aspnet.jpg',
        ],
        [
            'name' => 'Gin and Juice',
            'description' => 'Loja vulnerável da PortSwigger, publicada para treino. Não tem repositório público: o SAST não clona este alvo.',
            'target_url' => 'https://ginandjuice.shop',
            'repository_url' => 'https://ginandjuice.shop',
            'login_url' => 'https://ginandjuice.shop/login',
            'stack' => 'generic',
            'cover' => 'gin-and-juice.jpg',
        ],
    ];

    public function run(): void
    {
        Project::query()
            ->whereIn('name', self::RETIRED_PROJECT_NAMES)
            ->delete();

        foreach (self::DEMO_USER_EMAILS as $email) {
            $user = User::query()->where('email', $email)->first();

            if ($user === null) {
                continue;
            }

            $this->seedTargetsForUser($user);
        }
    }

    private function seedTargetsForUser(User $user): void
    {
        Project::query()
            ->where('user_id', $user->id)
            ->where('name', '!=', self::PROJECT_NAME)
            ->delete();

        $project = Project::query()->updateOrCreate(
            [
                'user_id' => $user->id,
                'name' => self::PROJECT_NAME,
            ],
            [
                'description' => 'Quatro aplicações que já existem e foram publicadas para teste de scanner. O mesmo catálogo ataca cada uma; a correção segue a stack do sistema.',
                'cover_path' => $this->publishSeedCover('pentest-lab.jpg'),
            ],
        );

        $names = array_column(self::TARGETS, 'name');

        System::query()
            ->where('project_id', $project->id)
            ->whereNotIn('name', $names)
            ->delete();

        foreach (self::TARGETS as $target) {
            $system = System::query()->updateOrCreate(
                [
                    'project_id' => $project->id,
                    'name' => $target['name'],
                ],
                [
                    'cover_path' => $this->publishSeedCover($target['cover']),
                    'target_url' => $target['target_url'],
                    'repository_url' => $target['repository_url'],
                    'login_url' => $target['login_url'],
                ],
            );

            $stack = Stack::query()->where('slug', $target['stack'])->first();

            if ($stack !== null) {
                $system->stacks()->sync([
                    $stack->id => ['is_primary' => true],
                ]);
            }
        }
    }
}
