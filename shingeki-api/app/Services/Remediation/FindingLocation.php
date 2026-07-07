<?php

namespace App\Services\Remediation;

readonly class FindingLocation
{
    public function __construct(
        public string $file,
        public int $startLine,
        public ?int $endLine = null,
        public ?string $matchedSnippet = null,
    ) {}

    public function endLineOrStart(): int
    {
        return $this->endLine ?? $this->startLine;
    }
}
