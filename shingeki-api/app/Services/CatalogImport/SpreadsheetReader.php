<?php

namespace App\Services\CatalogImport;

use RuntimeException;

class SpreadsheetReader
{
    /**
     * @return list<array<string, string>>
     */
    public function readRows(string $path, array $expectedHeaders): array
    {
        $handle = fopen($path, 'rb');

        if ($handle === false) {
            throw new RuntimeException('Unable to open uploaded spreadsheet.');
        }

        try {
            $headerRow = fgetcsv($handle);

            if ($headerRow === false) {
                throw new RuntimeException('Spreadsheet is empty.');
            }

            $headers = array_map(
                fn (mixed $value): string => $this->normalizeHeader((string) $value),
                $headerRow,
            );

            if ($headers !== $expectedHeaders) {
                throw new RuntimeException(
                    'Invalid header row. Expected: '.implode(',', $expectedHeaders),
                );
            }

            $rows = [];
            $lineNumber = 1;

            while (($data = fgetcsv($handle)) !== false) {
                $lineNumber++;

                if ($this->isBlankRow($data)) {
                    continue;
                }

                $row = [];

                foreach ($expectedHeaders as $index => $header) {
                    $row[$header] = trim((string) ($data[$index] ?? ''));
                }

                $row['_line'] = $lineNumber;
                $rows[] = $row;
            }

            return $rows;
        } finally {
            fclose($handle);
        }
    }

    private function normalizeHeader(string $value): string
    {
        $value = ltrim($value, "\xEF\xBB\xBF");

        return strtolower(trim($value));
    }

    /**
     * @param  array<int, string|null>  $data
     */
    private function isBlankRow(array $data): bool
    {
        foreach ($data as $value) {
            if (trim((string) $value) !== '') {
                return false;
            }
        }

        return true;
    }
}
