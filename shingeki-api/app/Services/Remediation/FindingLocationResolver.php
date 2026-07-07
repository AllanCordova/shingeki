<?php

namespace App\Services\Remediation;

use App\Models\SystemResult;
use App\Services\Source\SourceFileNormalizer;

class FindingLocationResolver
{
    public function resolve(SystemResult $result): ?FindingLocation
    {
        $location = SourceFileNormalizer::locationFromResult(
            $result->source_file,
            $result->start_line,
            $result->end_line,
            $result->vulnerable_route,
        );

        if ($location === null) {
            return null;
        }

        return new FindingLocation(
            file: $location['file'],
            startLine: $location['start_line'],
            endLine: $location['end_line'],
            matchedSnippet: $this->extractMatchedSnippet($result),
        );
    }

    private function extractMatchedSnippet(SystemResult $result): ?string
    {
        if (filled($result->matched_snippet)) {
            return trim((string) $result->matched_snippet);
        }

        $evidence = trim((string) $result->evidence);

        if ($evidence === '') {
            return null;
        }

        $parts = preg_split("/\R\R/", $evidence, 2);

        if (! is_array($parts) || count($parts) < 2) {
            return null;
        }

        $snippet = trim($parts[1]);

        return $snippet !== '' ? $snippet : null;
    }
}
