<?php

use App\Enums\Catalog\CatalogImportStatus;
use App\Enums\Catalog\CatalogImportType;
use App\Models\Catalog\Attack;
use App\Models\Catalog\CatalogImport;
use App\Models\Catalog\Remediation;
use App\Models\Catalog\Stack;
use App\Models\Identity\User;
use App\Services\Catalog\Import\AttackSpreadsheetParser;
use App\Services\Catalog\Import\CatalogImportQueuePublisher;
use App\Services\Catalog\Import\CatalogImportService;
use App\Services\Catalog\Import\CatalogRemediationRowValidator;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;

const ATTACK_IMPORT_TEMPLATE = '/api/catalog/attacks/import/template';
const ATTACK_IMPORT = '/api/catalog/attacks/import';
const REMEDIATION_IMPORT = '/api/catalog/remediations/import';
const CATALOG_IMPORT = '/api/catalog/imports';

function actingAsAdmin(): User
{
    $user = User::factory()->admin()->create();
    Sanctum::actingAs($user);

    return $user;
}

function validAttackImportCsv(array $rows): UploadedFile
{
    $lines = [implode(',', AttackSpreadsheetParser::HEADERS)];

    foreach ($rows as $row) {
        $lines[] = implode(',', [
            $row['scan_type'],
            $row['category'],
            $row['target_location'],
            $row['risk_level'],
            '"'.str_replace('"', '""', $row['payload_json']).'"',
        ]);
    }

    $path = tempnam(sys_get_temp_dir(), 'attack-import-');
    file_put_contents($path, implode("\n", $lines)."\n");

    return new UploadedFile($path, 'attacks.csv', 'text/csv', null, true);
}

describe('catalog bulk import access', function () {
    test('specialist can upload attack spreadsheet', function () {
        Sanctum::actingAs(User::factory()->specialist()->create());

        $this->mock(CatalogImportQueuePublisher::class)
            ->shouldReceive('publish')
            ->once();

        $this->postJson(ATTACK_IMPORT, [
            'file' => validAttackImportCsv([[
                'scan_type' => 'DAST',
                'category' => 'XSS',
                'target_location' => 'QUERY_PARAMETER',
                'risk_level' => 'MEDIUM',
                'payload_json' => '{"parameter":"q","value":"<script>alert(1)</script>"}',
            ]]),
        ])->assertAccepted();
    });

    test('regular user cannot upload attack spreadsheet', function () {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson(ATTACK_IMPORT, [
            'file' => validAttackImportCsv([[
                'scan_type' => 'DAST',
                'category' => 'XSS',
                'target_location' => 'QUERY_PARAMETER',
                'risk_level' => 'MEDIUM',
                'payload_json' => '{"parameter":"q","value":"<script>alert(1)</script>"}',
            ]]),
        ])->assertForbidden();
    });

    test('admin can download attack import template', function () {
        actingAsAdmin();

        $this->get(ATTACK_IMPORT_TEMPLATE)
            ->assertOk()
            ->assertHeader('content-disposition');
    });
});

describe('POST /api/catalog/attacks/import', function () {
    test('admin can queue a valid attack spreadsheet', function () {
        actingAsAdmin();

        $this->mock(CatalogImportQueuePublisher::class)
            ->shouldReceive('publish')
            ->once();

        $response = $this->postJson(ATTACK_IMPORT, [
            'file' => validAttackImportCsv([[
                'scan_type' => 'DAST',
                'category' => 'XSS',
                'target_location' => 'QUERY_PARAMETER',
                'risk_level' => 'MEDIUM',
                'payload_json' => '{"parameter":"q","value":"<script>alert(1)</script>"}',
            ]]),
        ]);

        $response
            ->assertAccepted()
            ->assertJsonPath('import.status', CatalogImportStatus::Pending->value)
            ->assertJsonPath('import.total_rows', 1);

        $this->assertDatabaseHas('catalog_imports', [
            'type' => CatalogImportType::Attacks->value,
            'total_rows' => 1,
        ]);
    });

    test('rejects spreadsheets with more than 200 rows', function () {
        actingAsAdmin();
        config(['catalog.import.max_rows' => 200]);

        $rows = array_fill(0, 201, [
            'scan_type' => 'DAST',
            'category' => 'XSS',
            'target_location' => 'QUERY_PARAMETER',
            'risk_level' => 'MEDIUM',
            'payload_json' => '{"parameter":"q","value":"1"}',
        ]);

        $this->postJson(ATTACK_IMPORT, [
            'file' => validAttackImportCsv($rows),
        ])->assertUnprocessable();
    });

    test('consumer persists queued attack rows', function () {
        $admin = actingAsAdmin();

        $import = CatalogImport::create([
            'user_id' => $admin->id,
            'type' => CatalogImportType::Attacks,
            'status' => CatalogImportStatus::Pending,
            'total_rows' => 1,
        ]);

        app(CatalogImportService::class)->processMessage([
            'import_id' => $import->id,
            'user_id' => $admin->id,
            'items' => [[
                'scan_type' => 'DAST',
                'category' => 'XSS',
                'target_location' => 'QUERY_PARAMETER',
                'risk_level' => 'MEDIUM',
                'payload' => ['parameter' => 'q', 'value' => '1'],
            ]],
            'chunk_index' => 0,
            'chunk_total' => 1,
        ]);

        expect(Attack::query()->where('user_id', $admin->id)->count())->toBe(1)
            ->and($import->fresh()->status)->toBe(CatalogImportStatus::Completed);
    });
});

describe('POST /api/catalog/remediations/import', function () {
    test('admin can queue a valid remediation spreadsheet', function () {
        actingAsAdmin();
        Stack::factory()->create(['slug' => 'vanilla_php', 'name' => 'PHP']);

        $this->mock(CatalogImportQueuePublisher::class)
            ->shouldReceive('publish')
            ->once();

        $path = tempnam(sys_get_temp_dir(), 'remediation-import-');
        file_put_contents($path, implode("\n", [
            'stack_slug,scan_type,attack_category,semgrep_rule_id,title,description,code_snippet,references',
            'vanilla_php,DAST,PATH_TRAVERSAL,,"Validar caminho","Descricao","$resolved = realpath($path);",https://owasp.org',
        ])."\n");

        $this->postJson(REMEDIATION_IMPORT, [
            'file' => new UploadedFile($path, 'remediations.csv', 'text/csv', null, true),
        ])->assertAccepted();
    });

    test('consumer persists queued remediation rows', function () {
        $admin = actingAsAdmin();
        $stack = Stack::factory()->create();

        $import = CatalogImport::create([
            'user_id' => $admin->id,
            'type' => CatalogImportType::Remediations,
            'status' => CatalogImportStatus::Pending,
            'total_rows' => 1,
        ]);

        app(CatalogImportService::class)->processMessage([
            'import_id' => $import->id,
            'user_id' => $admin->id,
            'items' => [[
                'stack_id' => $stack->id,
                'scan_type' => 'DAST',
                'attack_category' => 'PATH_TRAVERSAL',
                'semgrep_rule_id' => null,
                'title' => 'Titulo',
                'description' => 'Descricao',
                'code_snippet' => '$ok = true;',
                'references' => ['https://example.com'],
            ]],
            'chunk_index' => 0,
            'chunk_total' => 1,
        ]);

        expect(Remediation::query()->where('user_id', $admin->id)->count())->toBe(1);
    });

    test('remediation import normalizes escaped newlines in code snippets', function () {
        $validator = app(CatalogRemediationRowValidator::class);
        Stack::factory()->create(['slug' => 'vanilla_php']);

        $result = $validator->validate([
            'stack_slug' => 'vanilla_php',
            'scan_type' => 'SAST',
            'attack_category' => 'XSS',
            'semgrep_rule_id' => 'php.lang.security.injection.echoed-request.echoed-request',
            'title' => 'Escape output',
            'description' => 'Use encoding',
            'code_snippet' => "echo 'x';\\nif (\$ok) {\\n    exit;\\n}",
            'references' => 'https://example.com',
        ]);

        expect($result['errors'])->toBe([])
            ->and($result['data']['code_snippet'])->toBe("echo 'x';\nif (\$ok) {\n    exit;\n}");
    });
});
