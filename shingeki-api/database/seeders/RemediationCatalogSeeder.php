<?php

namespace Database\Seeders;

use App\Enums\AttackCategory;
use App\Enums\AttackScanType;
use App\Models\Remediation;
use App\Models\Stack;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class RemediationCatalogSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $catalogAdmin = User::query()
            ->where('email', config('attacks.catalog_admin_email'))
            ->firstOrFail();

        $vanillaPhp = Stack::query()->where('slug', 'vanilla_php')->firstOrFail();
        $laravel = Stack::query()->where('slug', 'laravel')->firstOrFail();
        $express = Stack::query()->where('slug', 'express')->firstOrFail();
        $react = Stack::query()->where('slug', 'react')->firstOrFail();

        $entries = [
            // Vanilla PHP — alvo vulnerável de laboratório (DAST)
            [
                'stack_id' => $vanillaPhp->id,
                'scan_type' => AttackScanType::Dast,
                'attack_category' => AttackCategory::PathTraversal,
                'title' => 'Restringir leitura ao diretório permitido',
                'description' => 'Nunca concatene entrada do usuário no caminho do arquivo. Use basename() e valide com realpath() que o arquivo final permanece dentro do diretório base.',
                'code_snippet' => "\$baseDir = realpath(__DIR__.'/../storage');\n\$requested = basename(\$file);\n\$target = \$baseDir.DIRECTORY_SEPARATOR.\$requested;\n\n\$resolved = realpath(\$target);\nif (\$resolved === false || ! str_starts_with(\$resolved, \$baseDir)) {\n    http_response_code(403);\n    exit;\n}\n\nreadfile(\$resolved);",
                'references' => ['https://owasp.org/www-community/attacks/Path_Traversal'],
            ],
            [
                'stack_id' => $vanillaPhp->id,
                'scan_type' => AttackScanType::Dast,
                'attack_category' => AttackCategory::SqlInjection,
                'title' => 'Use prepared statements com PDO',
                'description' => 'Substitua concatenação de strings em SQL por placeholders vinculados via PDO.',
                'code_snippet' => "\$stmt = db()->prepare('SELECT * FROM users WHERE email = ? AND password = ? LIMIT 1');\n\$stmt->execute([\$email, \$password]);\n\$user = \$stmt->fetch(PDO::FETCH_ASSOC);",
                'references' => ['https://www.php.net/manual/en/pdo.prepared-statements.php', 'https://owasp.org/www-community/attacks/SQL_Injection'],
            ],
            [
                'stack_id' => $vanillaPhp->id,
                'scan_type' => AttackScanType::Dast,
                'attack_category' => AttackCategory::Xss,
                'title' => 'Escape a saída com htmlspecialchars',
                'description' => 'Codifique dados do usuário antes de imprimir em HTML para evitar XSS refletido.',
                'code_snippet' => "echo '<p>Results for: '.htmlspecialchars(\$query, ENT_QUOTES | ENT_HTML5, 'UTF-8').'</p>';",
                'references' => ['https://www.php.net/manual/en/function.htmlspecialchars.php', 'https://owasp.org/www-community/attacks/xss/'],
            ],
            // Laravel
            [
                'stack_id' => $laravel->id,
                'attack_category' => AttackCategory::SqlInjection,
                'title' => 'Use Eloquent or query bindings',
                'description' => 'Never concatenate user input into SQL. Use the query builder or Eloquent with parameter binding.',
                'code_snippet' => "User::query()->where('email', \$email)->first();\n\n// or\nDB::select('SELECT * FROM users WHERE email = ?', [\$email]);",
                'references' => ['https://laravel.com/docs/eloquent', 'https://owasp.org/www-community/attacks/SQL_Injection'],
            ],
            [
                'stack_id' => $laravel->id,
                'semgrep_rule_id' => 'php.lang.security.injection.sql-injection',
                'scan_type' => AttackScanType::Sast,
                'title' => 'Replace raw SQL concatenation',
                'description' => 'Semgrep flagged a possible SQL injection. Use bindings or Eloquent.',
                'code_snippet' => "User::where('id', \$id)->first();",
                'references' => ['https://laravel.com/docs/queries'],
            ],
            [
                'stack_id' => $laravel->id,
                'attack_category' => AttackCategory::PathTraversal,
                'title' => 'Validate paths with Storage',
                'description' => 'Resolve paths inside allowed directories and reject traversal sequences.',
                'code_snippet' => "\$safe = Storage::disk('local')->path(basename(\$filename));\nif (! str_starts_with(realpath(\$safe), storage_path('app/private'))) {\n    abort(403);\n}",
                'references' => ['https://laravel.com/docs/filesystem'],
            ],
            // Express
            [
                'stack_id' => $express->id,
                'attack_category' => AttackCategory::SqlInjection,
                'title' => 'Use parameterized queries',
                'description' => 'Pass user input as query parameters instead of string interpolation.',
                'code_snippet' => "const result = await pool.query('SELECT * FROM users WHERE email = \$1', [email]);",
                'references' => ['https://node-postgres.com/features/queries'],
            ],
            // React
            [
                'stack_id' => $react->id,
                'attack_category' => AttackCategory::Xss,
                'title' => 'Avoid unsafe HTML injection',
                'description' => 'Do not render untrusted HTML. Prefer text nodes or sanitize before using dangerouslySetInnerHTML.',
                'code_snippet' => "// Prefer:\n<p>{userInput}</p>\n\n// If HTML is required, sanitize first:\nimport DOMPurify from 'dompurify';\n<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />",
                'references' => ['https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html'],
            ],
        ];

        foreach ($entries as $entry) {
            $this->upsertRemediation($entry, $catalogAdmin->id);
        }
    }

    /**
     * @param  array<string, mixed>  $entry
     */
    private function upsertRemediation(array $entry, string $userId): void
    {
        $query = Remediation::query()->where('stack_id', $entry['stack_id']);

        if (isset($entry['semgrep_rule_id'])) {
            $query->where('semgrep_rule_id', $entry['semgrep_rule_id']);
        } else {
            $query->where('attack_category', $entry['attack_category'])
                ->whereNull('semgrep_rule_id');

            if (isset($entry['scan_type'])) {
                $query->where('scan_type', $entry['scan_type']);
            } else {
                $query->whereNull('scan_type');
            }
        }

        if ($query->exists()) {
            return;
        }

        Remediation::create([
            ...$entry,
            'user_id' => $userId,
        ]);
    }
}
