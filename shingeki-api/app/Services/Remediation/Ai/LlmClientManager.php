<?php

namespace App\Services\Remediation\Ai;

use RuntimeException;

class LlmClientManager
{
    public function __construct(
        private readonly GeminiClient $gemini,
        private readonly GroqClient $groq,
    ) {}

    public function client(): LlmClient
    {
        $preferred = (string) config('ai.provider', 'gemini');

        foreach ($this->orderedClients($preferred) as $client) {
            if ($client->isConfigured()) {
                return $client;
            }
        }

        throw new RuntimeException('No AI provider is configured. Set GEMINI_API_KEY or GROQ_API_KEY.');
    }

    /**
     * @return list<LlmClient>
     */
    private function orderedClients(string $preferred): array
    {
        $clients = [
            'gemini' => $this->gemini,
            'groq' => $this->groq,
        ];

        $ordered = [];

        if (isset($clients[$preferred])) {
            $ordered[] = $clients[$preferred];
        }

        foreach ($clients as $name => $client) {
            if ($name !== $preferred) {
                $ordered[] = $client;
            }
        }

        return $ordered;
    }
}
