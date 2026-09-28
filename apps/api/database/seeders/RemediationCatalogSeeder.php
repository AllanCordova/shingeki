<?php

namespace Database\Seeders;

use App\Enums\Attack\AttackCategory;
use App\Enums\Attack\AttackScanType;
use App\Models\Remediation\Remediation;
use App\Models\System\Stack;
use App\Models\User\User;
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

        $stacks = Stack::query()->get()->keyBy('slug');

        foreach (self::definitions() as $definition) {
            $stack = $stacks->get($definition['stack_slug']);

            if ($stack === null) {
                continue;
            }

            $entry = $definition;
            unset($entry['stack_slug']);
            $entry['stack_id'] = $stack->id;
            $this->upsertRemediation($entry, $catalogAdmin->id);
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function definitions(): array
    {
        return [
            ...self::legacyDefinitions(),
            ...self::stackDefinitions(),
            ...self::genericDefinitions(),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function legacyDefinitions(): array
    {
        return [
            // Vanilla PHP — alvo vulnerável de laboratório (DAST)
            [
                'stack_slug' => 'vanilla_php',
                'scan_type' => AttackScanType::Dast,
                'attack_category' => AttackCategory::PathTraversal,
                'title' => 'Restringir leitura ao diretório permitido',
                'description' => 'Nunca concatene entrada do usuário no caminho do arquivo. Use basename() e valide com realpath() que o arquivo final permanece dentro do diretório base.',
                'code_snippet' => "\$baseDir = realpath(__DIR__.'/../storage');\n\$requested = basename(\$file);\n\$target = \$baseDir.DIRECTORY_SEPARATOR.\$requested;\n\n\$resolved = realpath(\$target);\nif (\$resolved === false || ! str_starts_with(\$resolved, \$baseDir)) {\n    http_response_code(403);\n    exit;\n}\n\nreadfile(\$resolved);",
                'references' => ['https://owasp.org/www-community/attacks/Path_Traversal'],
            ],
            [
                'stack_slug' => 'vanilla_php',
                'scan_type' => AttackScanType::Dast,
                'attack_category' => AttackCategory::SqlInjection,
                'title' => 'Use prepared statements com PDO',
                'description' => 'Substitua concatenação de strings em SQL por placeholders vinculados via PDO.',
                'code_snippet' => "\$stmt = db()->prepare('SELECT * FROM users WHERE email = ? AND password = ? LIMIT 1');\n\$stmt->execute([\$email, \$password]);\n\$user = \$stmt->fetch(PDO::FETCH_ASSOC);",
                'references' => ['https://www.php.net/manual/en/pdo.prepared-statements.php', 'https://owasp.org/www-community/attacks/SQL_Injection'],
            ],
            [
                'stack_slug' => 'vanilla_php',
                'scan_type' => AttackScanType::Dast,
                'attack_category' => AttackCategory::Xss,
                'title' => 'Escape a saída com htmlspecialchars',
                'description' => 'Codifique dados do usuário antes de imprimir em HTML para evitar XSS refletido.',
                'code_snippet' => "echo '<p>Results for: '.htmlspecialchars(\$query, ENT_QUOTES | ENT_HTML5, 'UTF-8').'</p>';",
                'references' => ['https://www.php.net/manual/en/function.htmlspecialchars.php', 'https://owasp.org/www-community/attacks/xss/'],
            ],
            // Vanilla PHP — alvo vulnerável (SAST / Semgrep)
            [
                'stack_slug' => 'vanilla_php',
                'scan_type' => AttackScanType::Sast,
                'attack_category' => AttackCategory::SqlInjection,
                'semgrep_rule_id' => 'php.lang.security.injection.tainted-sql-string.tainted-sql-string',
                'title' => 'Substitua o SQL concatenado por prepared statement (remova o sink)',
                'description' => 'Troque a string SQL concatenada por prepared statement com placeholders. Remova TODA a cadeia antiga ($sql, db()->query($sql)/db()->exec($sql)) e reconstrua a variável de resultado usada depois.',
                'code_snippet' => "\$stmt = db()->prepare('SELECT * FROM users WHERE email = ? AND password = ? LIMIT 1');\n\$stmt->execute([\$email, \$password]);\n\$user = \$stmt->fetch(PDO::FETCH_ASSOC) ?: false;",
                'references' => ['https://www.php.net/manual/en/pdo.prepared-statements.php', 'https://owasp.org/www-community/attacks/SQL_Injection'],
            ],
            [
                'stack_slug' => 'vanilla_php',
                'scan_type' => AttackScanType::Sast,
                'attack_category' => AttackCategory::Xss,
                'semgrep_rule_id' => 'php.lang.security.injection.echoed-request.echoed-request',
                'title' => 'Codifique a saída refletida com htmlspecialchars',
                'description' => 'Substitua o echo direto de dados de $_GET/$_POST por htmlspecialchars na mesma linha, removendo a linha vulnerável original.',
                'code_snippet' => "echo '<p>Results for: '.htmlspecialchars(\$query, ENT_QUOTES | ENT_HTML5, 'UTF-8').'</p>';",
                'references' => ['https://www.php.net/manual/en/function.htmlspecialchars.php', 'https://owasp.org/www-community/attacks/xss/'],
            ],
            [
                'stack_slug' => 'vanilla_php',
                'scan_type' => AttackScanType::Sast,
                'attack_category' => AttackCategory::PathTraversal,
                'semgrep_rule_id' => 'php.lang.security.injection.tainted-filename.tainted-filename',
                'title' => 'Confine a leitura ao storage com basename + realpath',
                'description' => 'Sanitize o nome do arquivo com basename(), resolva com realpath() e confirme str_starts_with no diretório base antes de qualquer is_file()/readfile(). Substitua todo o bloco vulnerável de uma vez.',
                'code_snippet' => "\$file = basename(str_replace('\\\\', '/', \$file));\nif (\$file === '' || str_contains(\$file, '..')) {\n    http_response_code(400);\n    exit('Invalid file name.');\n}\n\n\$storageDir = realpath(__DIR__.'/../storage');\nif (\$storageDir === false) {\n    http_response_code(500);\n    exit;\n}\n\n\$resolved = realpath(\$storageDir.DIRECTORY_SEPARATOR.\$file);\nif (\$resolved === false || ! str_starts_with(\$resolved, \$storageDir) || ! is_file(\$resolved)) {\n    http_response_code(404);\n    exit('File not found.');\n}\n\nheader('Content-Type: text/plain; charset=utf-8');\nreadfile(\$resolved);",
                'references' => ['https://owasp.org/www-community/attacks/Path_Traversal', 'https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html'],
            ],
            // Laravel
            [
                'stack_slug' => 'laravel',
                'attack_category' => AttackCategory::SqlInjection,
                'title' => 'Use Eloquent or query bindings',
                'description' => 'Never concatenate user input into SQL. Use the query builder or Eloquent with parameter binding.',
                'code_snippet' => "User::query()->where('email', \$email)->first();\n\n// or\nDB::select('SELECT * FROM users WHERE email = ?', [\$email]);",
                'references' => ['https://laravel.com/docs/eloquent', 'https://owasp.org/www-community/attacks/SQL_Injection'],
            ],
            [
                'stack_slug' => 'laravel',
                'semgrep_rule_id' => 'php.lang.security.injection.sql-injection',
                'scan_type' => AttackScanType::Sast,
                'title' => 'Replace raw SQL concatenation',
                'description' => 'Semgrep flagged a possible SQL injection. Use bindings or Eloquent.',
                'code_snippet' => "User::where('id', \$id)->first();",
                'references' => ['https://laravel.com/docs/queries'],
            ],
            [
                'stack_slug' => 'laravel',
                'attack_category' => AttackCategory::PathTraversal,
                'title' => 'Validate paths with Storage',
                'description' => 'Resolve paths inside allowed directories and reject traversal sequences.',
                'code_snippet' => "\$safe = Storage::disk('local')->path(basename(\$filename));\nif (! str_starts_with(realpath(\$safe), storage_path('app/private'))) {\n    abort(403);\n}",
                'references' => ['https://laravel.com/docs/filesystem'],
            ],
            // Express
            [
                'stack_slug' => 'express',
                'attack_category' => AttackCategory::SqlInjection,
                'title' => 'Use parameterized queries',
                'description' => 'Pass user input as query parameters instead of string interpolation.',
                'code_snippet' => "const result = await pool.query('SELECT * FROM users WHERE email = \$1', [email]);",
                'references' => ['https://node-postgres.com/features/queries'],
            ],
            // React
            [
                'stack_slug' => 'react',
                'attack_category' => AttackCategory::Xss,
                'title' => 'Avoid unsafe HTML injection',
                'description' => 'Do not render untrusted HTML. Prefer text nodes or sanitize before using dangerouslySetInnerHTML.',
                'code_snippet' => "// Prefer:\n<p>{userInput}</p>\n\n// If HTML is required, sanitize first:\nimport DOMPurify from 'dompurify';\n<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />",
                'references' => ['https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html'],
            ],
            // Angular
            [
                'stack_slug' => 'angular',
                'attack_category' => AttackCategory::Xss,
                'title' => 'Keep Angular interpolation and avoid bypassing sanitizer',
                'description' => 'Bind untrusted input as text. Do not use bypassSecurityTrustHtml unless the value is already sanitized.',
                'code_snippet' => "import { Component } from '@angular/core';\n\n@Component({ selector: 'app-search', template: '<p>{{ query }}</p>' })\nexport class SearchComponent {\n  query = '';\n}",
                'references' => ['https://angular.dev/best-practices/security'],
            ],
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function stackDefinitions(): array
    {
        $snippet = static fn (string $slug, AttackCategory $category, string $title, string $description, string $code, array $references): array => [
            'stack_slug' => $slug,
            'attack_category' => $category,
            'title' => $title,
            'description' => $description,
            'code_snippet' => $code,
            'references' => $references,
        ];

        $owaspSql = ['https://owasp.org/www-community/attacks/SQL_Injection'];
        $owaspXss = ['https://owasp.org/www-community/attacks/xss/'];
        $owaspSsti = ['https://owasp.org/www-community/attacks/Server_Side_Template_Injection'];

        return [
            $snippet('nextjs', AttackCategory::Xss, 'Renderize texto, não HTML cru', 'No Next.js, interpolação do React já escapa texto. Não use dangerouslySetInnerHTML com conteúdo do usuário sem sanitizar.', "<p>{query}</p>\n\n// HTML só depois de sanitizar:\nimport DOMPurify from 'dompurify';\n<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />", $owaspXss),
            $snippet('javascript', AttackCategory::Xss, 'Escreva texto com textContent', 'Não monte HTML com dados do usuário via innerHTML. Use nós de texto ou um sanitizador antes de inserir markup.', 'results.textContent = query;', $owaspXss),
            $snippet('typescript', AttackCategory::Xss, 'Trate a entrada como texto', 'Tipar a string não impede XSS. Atribua o valor a textContent ou escape antes de inserir no DOM.', 'results.textContent = query;', $owaspXss),
            $snippet('python', AttackCategory::SqlInjection, 'Use placeholders do DB-API', 'Mantenha o SQL fixo e passe os valores como parâmetros. Não use f-string nem concatenação na consulta.', 'cursor.execute("SELECT * FROM users WHERE email = %s", (email,))', $owaspSql),
            $snippet('ruby', AttackCategory::SqlInjection, 'Vincule parâmetros na consulta', 'Não interpole variáveis Ruby dentro do SQL. Use placeholders da API do banco.', 'db.prepare("SELECT * FROM users WHERE email = $1").execute(email)', $owaspSql),
            $snippet('java', AttackCategory::SqlInjection, 'Use PreparedStatement', 'O SQL fica constante e os valores entram por setString. Statement com concatenação é o sink de injeção.', "PreparedStatement stmt = connection.prepareStatement(\n    \"SELECT * FROM users WHERE email = ?\");\nstmt.setString(1, email);\nResultSet rows = stmt.executeQuery();", $owaspSql),
            $snippet('csharp', AttackCategory::SqlInjection, 'Passe parâmetros nomeados', 'Não monte o CommandText com a entrada do usuário. Declare o parâmetro e envie o valor à parte.', "command.CommandText = \"SELECT * FROM users WHERE email = @email\";\ncommand.Parameters.Add(\"@email\", SqlDbType.NVarChar).Value = email;", $owaspSql),
            $snippet('go', AttackCategory::SqlInjection, 'Use placeholders do database/sql', 'QueryRowContext recebe o SQL e os argumentos separados. Não use fmt.Sprintf na consulta.', 'row := db.QueryRowContext(ctx, "SELECT id FROM users WHERE email = $1", email)', $owaspSql),
            $snippet('kotlin', AttackCategory::SqlInjection, 'Use PreparedStatement no JDBC', 'Prepare a consulta uma vez e vincule o email com setString. Não concatene a entrada na string SQL.', "connection.prepareStatement(\"SELECT * FROM users WHERE email = ?\").use { stmt ->\n    stmt.setString(1, email)\n    stmt.executeQuery()\n}", $owaspSql),
            $snippet('elixir', AttackCategory::SqlInjection, 'Passe os valores fora do SQL', 'Repo.query! aceita a consulta e a lista de parâmetros. Não interpole a entrada na string.', 'Repo.query!("SELECT * FROM users WHERE email = $1", [email])', $owaspSql),
            $snippet('symfony', AttackCategory::SqlInjection, 'Consulte pelo repositório Doctrine', 'O findOneBy gera SQL parametrizado. Evite createQuery com concatenação de DQL ou SQL.', "\$user = \$this->entityManager\n    ->getRepository(User::class)\n    ->findOneBy(['email' => \$email]);", $owaspSql),
            $snippet('codeigniter', AttackCategory::SqlInjection, 'Use o binding do query builder', 'O segundo argumento de query() vira placeholder. Não interpole o email na string SQL.', "\$db->query('SELECT * FROM users WHERE email = ?', [\$email]);", $owaspSql),
            $snippet('cakephp', AttackCategory::SqlInjection, 'Filtre com array no ORM', 'where com array de condições é parametrizado. Não passe uma string SQL montada à mão.', "\$users->find()->where(['email' => \$email])->first();", $owaspSql),
            $snippet('wordpress', AttackCategory::SqlInjection, 'Prepare a consulta com $wpdb', '$wpdb->prepare escapa os placeholders %s e %d. Não concatene $_GET ou $_POST no SQL.', "\$wpdb->prepare(\n    \"SELECT * FROM {\$wpdb->users} WHERE user_email = %s\",\n    \$email\n);", ['https://developer.wordpress.org/apis/security/data-validation/', ...$owaspSql]),
            $snippet('livewire', AttackCategory::Xss, 'Escape a saída no Blade', 'A sintaxe {{ }} codifica HTML. {!! !!} imprime HTML cru e só deve receber conteúdo já sanitizado.', "<p>{{ \$query }}</p>\n{{-- evite {!! \$query !!} --}}", $owaspXss),
            $snippet('nestjs', AttackCategory::SqlInjection, 'Filtre pelo repositório com objeto where', 'O TypeORM monta os parâmetros a partir do objeto. Não passe uma string SQL com a entrada interpolada.', 'await this.userRepository.findOne({ where: { email } });', $owaspSql),
            $snippet('fastify', AttackCategory::SqlInjection, 'Envie valores como parâmetros da query', 'O cliente do banco recebe o SQL e o array de valores separados.', "await client.query('SELECT * FROM users WHERE email = \$1', [email]);", $owaspSql),
            $snippet('hono', AttackCategory::Xss, 'Responda texto, não HTML montado', 'c.text envia a busca como texto. c.html com a string do usuário reflete XSS.', "return c.text(query);\n// evite: c.html(query)", $owaspXss),
            $snippet('vue', AttackCategory::Xss, 'Use interpolação e evite v-html', 'Mustache escapa HTML. v-html interpreta markup e só é seguro com conteúdo sanitizado.', "<p>{{ query }}</p>\n<!-- evite v-html=\"query\" -->", $owaspXss),
            $snippet('nuxt', AttackCategory::Xss, 'Mantenha a interpolação do Vue', 'O template do Nuxt escapa texto. Não ligue dados do usuário em v-html.', "<p>{{ query }}</p>\n<!-- evite v-html=\"query\" -->", $owaspXss),
            $snippet('svelte', AttackCategory::Xss, 'Interpole texto e evite {@html}', '{query} é texto. {@html} renderiza markup e não deve receber a entrada crua.', "<p>{query}</p>\n<!-- evite {@html query} -->", $owaspXss),
            $snippet('sveltekit', AttackCategory::Xss, 'Não injete HTML da busca', 'A interpolação do Svelte já escapa. {@html} fica restrito a HTML sanitizado.', "<p>{query}</p>\n<!-- evite {@html query} -->", $owaspXss),
            $snippet('remix', AttackCategory::Xss, 'Renderize a busca como texto', 'JSX escapa o conteúdo de {query}. Não monte o HTML da resposta com a string do usuário.', '<p>{query}</p>', $owaspXss),
            $snippet('astro', AttackCategory::Xss, 'Evite set:html com dados do usuário', 'A expressão {query} no Astro é texto. set:html insere HTML e precisa de sanitização.', "<p>{query}</p>\n<!-- evite <p set:html={query} /> -->", $owaspXss),
            $snippet('htmx', AttackCategory::Xss, 'Escape o HTML parcial da resposta', 'htmx insere a resposta no DOM. O servidor precisa codificar a busca antes de devolver o fragmento.', "echo htmlspecialchars(\$query, ENT_QUOTES | ENT_HTML5, 'UTF-8');", $owaspXss),
            $snippet('django', AttackCategory::SqlInjection, 'Filtre pelo ORM', 'filter(email=email) gera SQL parametrizado. Evite extra() e RawSQL com a entrada concatenada.', 'User.objects.filter(email=email).first()', $owaspSql),
            $snippet('flask', AttackCategory::Ssti, 'Não renderize a entrada como template', 'render_template usa um arquivo fixo e a busca entra como variável. render_template_string(request.args) é SSTI.', "return render_template('search.html', query=query)\n# nunca: render_template_string(request.args['q'])", $owaspSsti),
            $snippet('fastapi', AttackCategory::SqlInjection, 'Monte a consulta no SQLAlchemy', 'A expressão where compara a coluna com o valor. Não interpole o email no text().', 'await session.execute(select(User).where(User.email == email))', $owaspSql),
            $snippet('rails', AttackCategory::SqlInjection, 'Use hash conditions no ActiveRecord', 'where(email: email) é parametrizado. where("email = \'#{email}\'") concatena SQL.', "User.where(email: email).first\n# evite: User.where(\"email = '#{email}'\")", $owaspSql),
            $snippet('spring', AttackCategory::SqlInjection, 'Consulte com parâmetro no Spring Data', 'O método do repositório vira uma query com binding. JdbcTemplate com string concatenada não.', 'userRepository.findByEmail(email);', $owaspSql),
            $snippet('ktor', AttackCategory::SqlInjection, 'Vincule o valor no JDBC', 'Mesmo atrás do Ktor, a consulta ao banco precisa de placeholder. Não monte o SQL na rota.', "connection.prepareStatement(\"SELECT * FROM users WHERE email = ?\").use { stmt ->\n    stmt.setString(1, email)\n}", $owaspSql),
            $snippet('aspnet', AttackCategory::SqlInjection, 'Use parâmetro nomeado no Dapper', 'O objeto anônimo vira parâmetro. Não interpole o email na string da query.', "await connection.QueryAsync<User>(\n    \"SELECT * FROM users WHERE email = @Email\",\n    new { Email = email });", $owaspSql),
            $snippet('blazor', AttackCategory::Xss, 'Deixe o Razor escapar o texto', '@query codifica HTML. MarkupString desliga o escape e só serve para HTML confiável.', "<p>@query</p>\n@* evite: @((MarkupString)query) *@", $owaspXss),
            $snippet('gin', AttackCategory::SqlInjection, 'Passe o argumento separado no database/sql', 'O handler do Gin não deve formatar SQL. Entregue o valor como argumento da query.', 'db.QueryRowContext(ctx, "SELECT id FROM users WHERE email = ?", email)', $owaspSql),
            $snippet('phoenix', AttackCategory::SqlInjection, 'Busque com o schema do Ecto', 'get_by gera a consulta parametrizada. Não interpole a entrada em fragment.', 'Repo.get_by(User, email: email)', $owaspSql),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function genericDefinitions(): array
    {
        $items = [
            AttackCategory::SqlInjection->value => [
                'title' => 'Use consultas parametrizadas',
                'description' => 'Não concatene entrada do usuário na consulta. Mantenha o SQL fixo e envie os valores por placeholders, bindings ou o ORM.',
                'code_snippet' => "query = \"SELECT * FROM users WHERE email = ?\"\ndb.execute(query, [email])",
                'references' => ['https://owasp.org/www-community/attacks/SQL_Injection', 'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html'],
            ],
            AttackCategory::Xss->value => [
                'title' => 'Codifique a saída e evite HTML cru',
                'description' => 'Trate dados do usuário como texto. Só renderize HTML depois de um sanitizador e restrinja scripts com Content-Security-Policy.',
                'code_snippet' => "render_text(user_input)\n\n# HTML só depois de sanitizar\nsafe_html = sanitize(html)",
                'references' => ['https://owasp.org/www-community/attacks/xss/', 'https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html'],
            ],
            AttackCategory::Csrf->value => [
                'title' => 'Exija um token anti-CSRF em mudanças de estado',
                'description' => 'POST, PUT, PATCH e DELETE devem carregar um token ligado à sessão. Cookies de sessão usam SameSite.',
                'code_snippet' => "on POST, PUT, PATCH, DELETE:\n  reject unless csrf_token matches session\nset session cookie SameSite=Lax",
                'references' => ['https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html'],
            ],
            AttackCategory::CommandInjection->value => [
                'title' => 'Não passe entrada do usuário para o shell',
                'description' => 'Evite o shell. Se um processo externo for inevitável, chame-o com lista de argumentos e valide cada um contra uma allowlist.',
                'code_snippet' => "run([\"tool\", \"--name\", allowlisted_name])\n# sem string de shell e sem metacaracteres da entrada",
                'references' => ['https://owasp.org/www-community/attacks/Command_Injection'],
            ],
            AttackCategory::PathTraversal->value => [
                'title' => 'Resolva o caminho dentro de um diretório base',
                'description' => 'Fique só com o nome do arquivo, resolva o caminho canônico e recuse qualquer arquivo fora do diretório permitido.',
                'code_snippet' => "name = basename(user_input)\nfull = canonical(base_dir + \"/\" + name)\nreject unless full starts with canonical(base_dir)",
                'references' => ['https://owasp.org/www-community/attacks/Path_Traversal'],
            ],
            AttackCategory::Ssrf->value => [
                'title' => 'Permita só destinos conhecidos',
                'description' => 'Não busque uma URL livre no servidor. Use allowlist de hosts e bloqueie localhost, IPs privados e metadados de cloud.',
                'code_snippet' => "host = parse_url(user_url).host\nreject unless host in allowlist\nreject if host resolves to private, loopback, or link-local",
                'references' => ['https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html'],
            ],
            AttackCategory::Xxe->value => [
                'title' => 'Desligue entidades externas no parser XML',
                'description' => 'O parser não deve resolver DTD nem entidades externas. Prefira JSON quando o XML não for necessário.',
                'code_snippet' => "parser.disallow_doctype = true\nparser.external_entities = false",
                'references' => ['https://owasp.org/www-community/vulnerabilities/XML_External_Entity_(XXE)_Processing'],
            ],
            AttackCategory::LdapInjection->value => [
                'title' => 'Escape filtros LDAP',
                'description' => 'Não concatene entrada em filtros LDAP. Escape os caracteres especiais ou use uma API de filtro parametrizado.',
                'code_snippet' => "filter = \"(uid=\" + ldap_escape(username) + \")\"",
                'references' => ['https://cheatsheetseries.owasp.org/cheatsheets/LDAP_Injection_Prevention_Cheat_Sheet.html'],
            ],
            AttackCategory::NosqlInjection->value => [
                'title' => 'Não aceite operadores vindos do cliente',
                'description' => 'Recuse objetos com chaves de operador. Converta a entrada para o tipo esperado antes de consultar.',
                'code_snippet' => "email = string(input.email)  # rejeita {\"\$gt\": \"\"}\ndb.users.find({ email: email })",
                'references' => ['https://owasp.org/www-community/attacks/NoSQL_injection'],
            ],
            AttackCategory::Idor->value => [
                'title' => 'Autorize o acesso em toda leitura e escrita',
                'description' => 'Não confie no identificador enviado pelo cliente. Carregue o registro e confirme que o usuário autenticado pode acessá-lo.',
                'code_snippet' => "record = db.find(id)\nreject unless record.owner_id == current_user.id",
                'references' => ['https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html'],
            ],
            AttackCategory::OpenRedirect->value => [
                'title' => 'Redirecione só para destinos permitidos',
                'description' => 'Não use a URL do usuário como destino. Aceite apenas caminhos relativos da aplicação ou hosts em allowlist.',
                'code_snippet' => "reject unless redirect starts with \"/\" and not \"//\"\n# ou: reject unless host(redirect) in allowlist",
                'references' => ['https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html'],
            ],
            AttackCategory::Ssti->value => [
                'title' => 'Não renderize entrada do usuário como template',
                'description' => 'A entrada é dado, não código de template. Templates dinâmicos precisam de sandbox sem acesso a objetos internos.',
                'code_snippet' => "template.render({ name: user_input })\n# nunca: engine.render(user_input)",
                'references' => ['https://owasp.org/www-community/attacks/Server_Side_Template_Injection'],
            ],
            AttackCategory::JwtConfusion->value => [
                'title' => 'Fixe o algoritmo e valide a assinatura',
                'description' => 'Não aceite o algoritmo vindo do token. Recuse alg=none, verifique a assinatura com a chave esperada e confira emissor, audiência e expiração.',
                'code_snippet' => "reject unless header.alg == expected_alg\nverify(token, trusted_key)\nreject if expired or issuer/audience mismatch",
                'references' => ['https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html'],
            ],
            AttackCategory::SupplyChain->value => [
                'title' => 'Trave dependências e verifique a integridade',
                'description' => 'Commite o lockfile, instale com verificação de integridade e revise pacotes novos antes de aceitar a atualização.',
                'code_snippet' => "commit lockfile\ninstall --frozen-lockfile\nreview dependency updates before merge",
                'references' => ['https://cheatsheetseries.owasp.org/cheatsheets/Vulnerable_Dependency_Management_Cheat_Sheet.html'],
            ],
        ];

        $definitions = [];

        foreach ($items as $category => $item) {
            $definitions[] = [
                'stack_slug' => 'generic',
                'attack_category' => AttackCategory::from($category),
                ...$item,
            ];
        }

        return $definitions;
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
