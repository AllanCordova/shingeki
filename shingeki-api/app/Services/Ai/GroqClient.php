<?php

namespace App\Services\Ai;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class GroqClient implements LlmClient
{
    public function name(): string
    {
        return 'groq';
    }

    public function model(): string
    {
        return (string) config('ai.groq.model');
    }

    public function isConfigured(): bool
    {
        return filled(config('ai.groq.api_key'));
    }

    /**
     * @return array<string, mixed>
     */
    public function generateJson(string $systemPrompt, string $userPrompt): array
    {
        $apiKey = (string) config('ai.groq.api_key');
        $model = $this->model();
        $baseUrl = rtrim((string) config('ai.groq.base_url'), '/');
        $temperature = (float) config('ai.temperature', 0.15);

        $response = Http::withToken($apiKey)
            ->timeout(60)
            ->post("{$baseUrl}/chat/completions", [
                'model' => $model,
                'temperature' => $temperature,
                'response_format' => ['type' => 'json_object'],
                'messages' => [
                    ['role' => 'system', 'content' => $systemPrompt],
                    ['role' => 'user', 'content' => $userPrompt],
                ],
            ]);

        if (! $response->successful()) {
            throw new RuntimeException('Groq API request failed: '.$response->body());
        }

        $text = data_get($response->json(), 'choices.0.message.content');

        if (! is_string($text) || $text === '') {
            throw new RuntimeException('Groq API returned an empty response.');
        }

        $decoded = json_decode($text, true);

        if (! is_array($decoded)) {
            throw new RuntimeException('Groq API returned invalid JSON.');
        }

        return $decoded;
    }
}
