<?php

namespace Database\Seeders;

use App\Enums\Attack\AttackCategory;

/**
 * Oracle of the four public scanner targets.
 *
 * Each entry lists only classes this catalog can name, taken from the target's
 * own published inventory. ScannerTargetRoutes is the surface a DAST dispatch
 * attacks for those classes. Challenges outside the catalog stay listed apart.
 */
final class ScannerTargetExpectations
{
    /**
     * @return array<string, array{
     *     note: string,
     *     in_catalog: list<array{category: string, where: string, session: string}>,
     *     unreliable: list<array{category: string, where: string}>,
     *     outside_catalog: list<string>
     * }>
     */
    public static function all(): array
    {
        return [
            'OWASP Juice Shop' => [
                'note' => 'O scoreboard oficial tem 116 desafios. Aqui entra só o recorte que o catálogo desta ferramenta sabe nomear.',
                'in_catalog' => [
                    self::finding(AttackCategory::SqlInjection, 'Login Admin, Login Bender, Login Jim e User Credentials.', 'public'),
                    self::finding(AttackCategory::Xss, 'Reflected XSS, DOM XSS, API-only XSS, HTTP-Header XSS e Video XSS.', 'mixed'),
                    self::finding(AttackCategory::PathTraversal, 'Local File Read e Poison Null Byte.', 'account'),
                    self::finding(AttackCategory::Ssrf, 'Desafio SSRF: pedido a um recurso escondido no servidor.', 'account'),
                    self::finding(AttackCategory::Xxe, 'XXE Data Access.', 'account'),
                    self::finding(AttackCategory::NosqlInjection, 'NoSQL Manipulation, NoSQL Exfiltration e NoSQL DoS.', 'account'),
                    self::finding(AttackCategory::Idor, 'View Basket e Manipulate Basket.', 'account'),
                    self::finding(AttackCategory::OpenRedirect, 'Allowlist Bypass e Outdated Allowlist.', 'public'),
                    self::finding(AttackCategory::Ssti, 'Desafio SSTi.', 'account'),
                    self::finding(AttackCategory::JwtConfusion, 'Unsigned JWT e Forged Signed JWT.', 'account'),
                    self::finding(AttackCategory::SupplyChain, 'Supply Chain Attack e Vulnerable Library.', 'public'),
                    self::finding(AttackCategory::SecretLeak, 'Leaked API Key, Exposed Credentials e Password Hash Leak.', 'mixed'),
                ],
                'unreliable' => [
                    [
                        'category' => AttackCategory::Csrf->value,
                        'where' => 'O próprio desafio CSRF do Juice Shop registra que deixou de funcionar no Chrome e no Firefox atuais.',
                    ],
                ],
                'outside_catalog' => [
                    'Lógica de negócio, CAPTCHA, segundo fator, Web3, criptografia, esteganografia e prompt injection do chatbot.',
                    'Não há desafio de LDAP nem de command injection separado do SSTi.',
                ],
            ],
            'Google Firing Range' => [
                'note' => 'Índice público v0.48. As páginas abrem sem login.',
                'in_catalog' => [
                    self::finding(AttackCategory::Xss, 'Reflected XSS, DOM XSS, tag-based XSS, Angular XSS, escaped XSS, remote inclusion XSS, Address DOM XSS e URL-based DOM XSS.', 'public'),
                    self::finding(AttackCategory::OpenRedirect, 'Redirect XSS.', 'public'),
                ],
                'unreliable' => [],
                'outside_catalog' => [
                    'Clickjacking, reverse clickjacking, CORS, Flash injection, mixed content, HSTS e cookie httpOnly vazado.',
                    'Bibliotecas vulneráveis e script de terceiro inseguro aparecem no índice, mas não são o que o DAST confirma como supply chain.',
                ],
            ],
            'Acunetix ASP.NET' => [
                'note' => 'A página inicial declara SQL injection e XSS. O aviso de "and more" não lista o restante, então o conjunto não inventa outras classes.',
                'in_catalog' => [
                    self::finding(AttackCategory::SqlInjection, 'Formulário de login e identificadores das notícias e dos comentários.', 'public'),
                    self::finding(AttackCategory::Xss, 'Comentários das notícias. O site avisa que comentários maliciosos são apagados todo dia.', 'public'),
                ],
                'unreliable' => [],
                'outside_catalog' => [
                    'O site não publica o inventário além de SQL injection e XSS.',
                ],
            ],
            'Gin and Juice' => [
                'note' => 'Lista oficial em /vulnerabilities. Parte do catálogo e do estoque depende da conta de teste publicada nessa página.',
                'in_catalog' => [
                    self::finding(AttackCategory::SqlInjection, '/catalog.', 'public'),
                    self::finding(AttackCategory::Xss, 'XSS refletido em /catalog e XSS de DOM em /blog.', 'public'),
                    self::finding(AttackCategory::OpenRedirect, 'Redirecionamento de DOM em /blog.', 'public'),
                    self::finding(AttackCategory::Xxe, '/catalog/product/stock.', 'public'),
                ],
                'unreliable' => [],
                'outside_catalog' => [
                    'Prototype pollution, template injection no cliente, request URL override, injeção de header, manipulação de link, parâmetro em Base64 e manipulação de DOM.',
                    'Template injection no cliente não é SSTI de servidor. A loja usa token de CSRF de uso único, então ausência de CSRF não é um achado esperado.',
                ],
            ],
        ];
    }

    /**
     * @return array{category: string, where: string, session: string}
     */
    private static function finding(AttackCategory $category, string $where, string $session): array
    {
        return [
            'category' => $category->value,
            'where' => $where,
            'session' => $session,
        ];
    }
}
