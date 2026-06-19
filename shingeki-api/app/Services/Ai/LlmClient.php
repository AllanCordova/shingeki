<?php

namespace App\Services\Ai;

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
