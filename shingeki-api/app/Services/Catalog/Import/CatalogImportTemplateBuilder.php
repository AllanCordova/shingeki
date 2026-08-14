<?php

namespace App\Services\Catalog\Import;

use App\Enums\Catalog\AttackCategory;
use App\Enums\Catalog\AttackRiskLevel;
use App\Enums\Catalog\AttackTargetLocation;
use App\Enums\Catalog\CatalogImportType;
use App\Enums\Scanning\AttackScanType;

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
