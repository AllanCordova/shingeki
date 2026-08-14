<?php

namespace App\Services\Source;

readonly class SourceContext
{
    public function __construct(
        public string $excerpt,
        public ?string $file = null,
        public ?int $line = null,
        public string $origin = 'evidence',
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'excerpt' => $this->excerpt,
            'file' => $this->file,
            'line' => $this->line,
            'origin' => $this->origin,
        ];
    }
}
