<?php

namespace App\Services\Remediation\Ai;

interface LlmClient
{
    public function name(): string;

    public function model(): string;

    public function isConfigured(): bool;

    /**
     * @return array<string, mixed>
     */
    public function generateJson(string $systemPrompt, string $userPrompt): array;
}
