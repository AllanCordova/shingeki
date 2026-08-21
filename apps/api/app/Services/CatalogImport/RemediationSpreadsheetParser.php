<?php

namespace App\Services\CatalogImport;

use Illuminate\Http\UploadedFile;
use RuntimeException;

class RemediationSpreadsheetParser
{
    /**
     * @var list<string>
     */
    public const HEADERS = [
        'stack_slug',
        'scan_type',
        'attack_category',
        'semgrep_rule_id',
        'title',
        'description',
        'code_snippet',
        'references',
    ];

    public function __construct(
        private readonly SpreadsheetReader $reader,
        private readonly CatalogRemediationRowValidator $validator,
    ) {}

    /**
     * @return array{
     *     rows: list<array<string, mixed>>,
     *     errors: list<array{row: int, messages: list<string>}>
     * }
     */
    public function parse(UploadedFile $file): array
    {
        $this->assertCsv($file);
        $maxRows = config('catalog.import.max_rows');

        $rawRows = $this->reader->readRows($file->getRealPath(), self::HEADERS);

        if (count($rawRows) > $maxRows) {
            throw new RuntimeException("Spreadsheet exceeds the maximum of {$maxRows} data rows.");
        }

        $rows = [];
        $errors = [];

        foreach ($rawRows as $rawRow) {
            $line = (int) $rawRow['_line'];
            unset($rawRow['_line']);

            $result = $this->validator->validate($rawRow);

            if ($result['data'] === null) {
                $errors[] = [
                    'row' => $line,
                    'messages' => $result['errors'],
                ];

                continue;
            }

            $rows[] = $result['data'];
        }

        return compact('rows', 'errors');
    }

    private function assertCsv(UploadedFile $file): void
    {
        $extension = strtolower($file->getClientOriginalExtension());

        if (! in_array($extension, ['csv', 'txt'], true)) {
            throw new RuntimeException('Upload a CSV spreadsheet (.csv).');
        }
    }
}
