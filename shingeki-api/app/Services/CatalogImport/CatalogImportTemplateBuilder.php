<?php

namespace App\Services\CatalogImport;

use App\Enums\AttackCategory;
use App\Enums\AttackRiskLevel;
use App\Enums\AttackScanType;
use App\Enums\AttackTargetLocation;
use App\Enums\CatalogImportType;

class CatalogImportTemplateBuilder
{
    public function attacksCsv(): string
    {
        $lines = [
            implode(',', AttackSpreadsheetParser::HEADERS),
            implode(',', [
                AttackScanType::Dast->value,
                AttackCategory::Xss->value,
                AttackTargetLocation::QueryParameter->value,
                AttackRiskLevel::Medium->value,
                '"{""parameter"":""q"",""value"":""<script>alert(1)</script>""}"',
            ]),
        ];

        return implode("\n", $lines)."\n";
    }

    public function remediationsCsv(): string
    {
        $lines = [
            implode(',', RemediationSpreadsheetParser::HEADERS),
            implode(',', [
                'vanilla_php',
                AttackScanType::Dast->value,
                AttackCategory::PathTraversal->value,
                '',
                '"Restringir leitura ao diretorio permitido"',
                '"Valide o caminho resolvido com realpath() antes de ler o arquivo."',
                '"$resolved = realpath($path);"',
                'https://owasp.org/www-community/attacks/Path_Traversal',
            ]),
        ];

        return implode("\n", $lines)."\n";
    }

    public function filename(CatalogImportType $type): string
    {
        return match ($type) {
            CatalogImportType::Attacks => 'catalog-attacks-template.csv',
            CatalogImportType::Remediations => 'catalog-remediations-template.csv',
        };
    }
}
