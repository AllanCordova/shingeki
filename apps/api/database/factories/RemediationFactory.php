<?php

namespace Database\Factories;

use App\Enums\Attack\AttackCategory;
use App\Enums\Attack\AttackScanType;
use App\Models\Remediation\Remediation;
use App\Models\System\Stack;
use App\Models\User\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Remediation>
 */
class RemediationFactory extends Factory
{
    protected $model = Remediation::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'stack_id' => Stack::factory()->vanillaPhp(),
            'scan_type' => AttackScanType::Dast,
            'attack_category' => AttackCategory::PathTraversal,
            'semgrep_rule_id' => null,
            'title' => 'Restringir leitura ao diretório permitido',
            'description' => 'Valide o caminho resolvido com realpath() antes de ler o arquivo.',
            'code_snippet' => "\$resolved = realpath(\$target);\nif (\$resolved === false || ! str_starts_with(\$resolved, \$baseDir)) {\n    http_response_code(403);\n    exit;\n}",
            'references' => ['https://owasp.org/www-community/attacks/Path_Traversal'],
        ];
    }

    public function forVanillaPhp(): static
    {
        return $this->state(fn () => [
            'stack_id' => Stack::factory()->vanillaPhp(),
        ]);
    }

    public function pathTraversal(): static
    {
        return $this->state(fn () => [
            'scan_type' => AttackScanType::Dast,
            'attack_category' => AttackCategory::PathTraversal,
            'semgrep_rule_id' => null,
            'title' => 'Restringir leitura ao diretório permitido',
            'description' => 'Use basename() e valide com realpath() que o arquivo permanece no diretório base.',
            'code_snippet' => "\$baseDir = realpath(__DIR__.'/../storage');\n\$requested = basename(\$file);\n\$target = \$baseDir.DIRECTORY_SEPARATOR.\$requested;",
            'references' => ['https://owasp.org/www-community/attacks/Path_Traversal'],
        ]);
    }

    public function sqlInjection(): static
    {
        return $this->state(fn () => [
            'scan_type' => AttackScanType::Dast,
            'attack_category' => AttackCategory::SqlInjection,
            'semgrep_rule_id' => null,
            'title' => 'Use prepared statements com PDO',
            'description' => 'Substitua concatenação de strings em SQL por placeholders vinculados.',
            'code_snippet' => "\$stmt = db()->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');\n\$stmt->execute([\$email]);",
            'references' => ['https://www.php.net/manual/en/pdo.prepared-statements.php'],
        ]);
    }
}
