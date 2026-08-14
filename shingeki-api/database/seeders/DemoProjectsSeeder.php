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

    /**
     * @var list<array{
     *     name: string,
     *     description: string,
     *     cover: string,
     *     systems: list<array{
     *         name: string,
     *         target_url: string,
     *         repository_url: string,
     *         stack: string,
     *         cover: string
     *     }>
     * }>
     */
    private const DEMO_PROJECTS = [
        [
            'name' => 'Netflix',
            'description' => 'Plataforma de streaming, catalogo de midia e experiencia do assinante.',
            'cover' => 'netflix.jpg',
            'systems' => [
                [
                    'name' => 'API de Catalogo',
                    'target_url' => 'https://catalog.api.netflix.example',
                    'repository_url' => 'https://github.com/netflix/catalog-api',
                    'stack' => 'nextjs',
                    'cover' => 'netflix-api-catalogo.jpg',
                ],
                [
                    'name' => 'Servico de Autenticacao',
                    'target_url' => 'https://auth.netflix.example',
                    'repository_url' => 'https://github.com/netflix/auth-service',
                    'stack' => 'laravel',
                    'cover' => 'netflix-servico-autenticacao.jpg',
                ],
                [
                    'name' => 'Motor de Recomendacoes',
                    'target_url' => 'https://recommendations.netflix.example',
                    'repository_url' => 'https://github.com/netflix/recommendation-engine',
                    'stack' => 'express',
                    'cover' => 'netflix-motor-recomendacoes.jpg',
                ],
                [
                    'name' => 'Portal de Billing',
                    'target_url' => 'https://billing.netflix.example',
                    'repository_url' => 'https://github.com/netflix/billing-portal',
                    'stack' => 'react',
                    'cover' => 'netflix-portal-billing.jpg',
                ],
            ],
        ],
        [
            'name' => 'Mercado Livre',
            'description' => 'Marketplace, pagamentos e operacoes para vendedores e compradores.',
            'cover' => 'mercado-livre.webp',
            'systems' => [
                [
                    'name' => 'API do Marketplace',
                    'target_url' => 'https://api.mercadolivre.example',
                    'repository_url' => 'https://github.com/mercadolibre/marketplace-api',
                    'stack' => 'laravel',
                    'cover' => 'mercado-livre-api-marketplace.jpg',
                ],
                [
                    'name' => 'Plataforma de Pagamentos',
                    'target_url' => 'https://payments.mercadolivre.example',
                    'repository_url' => 'https://github.com/mercadolibre/payments-core',
                    'stack' => 'express',
                    'cover' => 'mercado-livre-plataforma-pagamentos.jpg',
                ],
                [
                    'name' => 'Logistica e Envios',
                    'target_url' => 'https://logistics.mercadolivre.example',
                    'repository_url' => 'https://github.com/mercadolibre/logistics-service',
                    'stack' => 'nextjs',
                    'cover' => 'mercado-livre-logistica-envios.jpg',
                ],
                [
                    'name' => 'Portal do Vendedor',
                    'target_url' => 'https://seller.mercadolivre.example',
                    'repository_url' => 'https://github.com/mercadolibre/seller-portal',
                    'stack' => 'react',
                    'cover' => 'mercado-livre-portal-vendedor.jpg',
                ],
            ],
        ],
        [
            'name' => 'Nubank',
            'description' => 'Servicos financeiros digitais, credito e integracoes open finance.',
            'cover' => 'nubank.jpg',
            'systems' => [
                [
                    'name' => 'API do Aplicativo',
                    'target_url' => 'https://api.nubank.example',
                    'repository_url' => 'https://github.com/nubank/mobile-api',
                    'stack' => 'express',
                    'cover' => 'nubank-api-aplicativo.jpg',
                ],
                [
                    'name' => 'Servico Pix',
                    'target_url' => 'https://pix.nubank.example',
                    'repository_url' => 'https://github.com/nubank/pix-service',
                    'stack' => 'laravel',
                    'cover' => 'nubank-servico-pix.jpg',
                ],
                [
                    'name' => 'Motor de Credito',
                    'target_url' => 'https://credit.nubank.example',
                    'repository_url' => 'https://github.com/nubank/credit-engine',
                    'stack' => 'nextjs',
                    'cover' => 'nubank-motor-credito.jpg',
                ],
                [
                    'name' => 'Open Finance Gateway',
                    'target_url' => 'https://openfinance.nubank.example',
                    'repository_url' => 'https://github.com/nubank/open-finance-gateway',
                    'stack' => 'react',
                    'cover' => 'nubank-open-finance-gateway.jpg',
                ],
            ],
        ],
        [
            'name' => 'iFood',
            'description' => 'Pedidos online, restaurantes parceiros e operacao de entregas.',
            'cover' => 'ifood.jpg',
            'systems' => [
                [
                    'name' => 'API de Restaurantes',
                    'target_url' => 'https://restaurants.ifood.example',
                    'repository_url' => 'https://github.com/ifood/restaurants-api',
                    'stack' => 'laravel',
                    'cover' => 'ifood-api-restaurantes.jpg',
                ],
                [
                    'name' => 'Servico de Pedidos',
                    'target_url' => 'https://orders.ifood.example',
                    'repository_url' => 'https://github.com/ifood/orders-service',
                    'stack' => 'express',
                    'cover' => 'ifood-servico-pedidos.jpg',
                ],
                [
                    'name' => 'Dispatch de Entregas',
                    'target_url' => 'https://dispatch.ifood.example',
                    'repository_url' => 'https://github.com/ifood/dispatch-service',
                    'stack' => 'nextjs',
                    'cover' => 'ifood-dispatch-entregas.jpg',
                ],
                [
                    'name' => 'API do Cliente',
                    'target_url' => 'https://consumer.ifood.example',
                    'repository_url' => 'https://github.com/ifood/consumer-api',
                    'stack' => 'react',
                    'cover' => 'ifood-api-cliente.jpg',
                ],
            ],
        ],
    ];

    public function run(): void
    {
        foreach (self::DEMO_USER_EMAILS as $email) {
            $user = User::query()->where('email', $email)->first();

            if ($user === null) {
                continue;
            }

            $this->seedProjectsForUser($user);
        }
    }

    private function seedProjectsForUser(User $user): void
    {
        foreach (self::DEMO_PROJECTS as $definition) {
            $project = Project::query()->updateOrCreate(
                [
                    'user_id' => $user->id,
                    'name' => $definition['name'],
                ],
                [
                    'description' => $definition['description'],
                    'cover_path' => $this->publishSeedCover($definition['cover']),
                ],
            );

            foreach ($definition['systems'] as $systemDefinition) {
                $system = System::query()->updateOrCreate(
                    [
                        'project_id' => $project->id,
                        'name' => $systemDefinition['name'],
                    ],
                    [
                        'cover_path' => $this->publishSeedCover($systemDefinition['cover']),
                        'target_url' => $systemDefinition['target_url'],
                        'repository_url' => $systemDefinition['repository_url'],
                    ],
                );

                $stack = Stack::query()->where('slug', $systemDefinition['stack'])->first();

                if ($stack !== null) {
                    $system->stacks()->sync([
                        $stack->id => ['is_primary' => true],
                    ]);
                }
            }
        }
    }
}
