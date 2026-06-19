<?php

namespace App\Services\Ai;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class GeminiClient implements LlmClient
{
    public function name(): string
    {
        return 'gemini';
    }

    public function model(): string
    {
        return (string) config('ai.gemini.model');
    }

    public function isConfigured(): bool
    {
        return filled(config('ai.gemini.api_key'));
    }

    /**
     * @return array<string, mixed>
     */
    public function generateJson(string $systemPrompt, string $userPrompt): array
    {
        $apiKey = (string) config('ai.gemini.api_key');
        $model = $this->model();
        $baseUrl = rtrim((string) config('ai.gemini.base_url'), '/');
        $temperature = (float) config('ai.temperature', 0.15);

        $response = Http::timeout(60)
            ->post("{$baseUrl}/models/{$model}:generateContent?key={$apiKey}", [
                'system_instruction' => [
                    'parts' => [
                        ['text' => $systemPrompt],
                    ],
                ],
                'contents' => [
                    [
                        'role' => 'user',
                        'parts' => [
                            ['text' => $userPrompt],
                        ],
                    ],
                ],
                'generationConfig' => [
                    'temperature' => $temperature,
                    'responseMimeType' => 'application/json',
                ],
            ]);

        if (! $response->successful()) {
            throw new RuntimeException('Gemini API request failed: '.$response->body());
        }

        $text = data_get($response->json(), 'candidates.0.content.parts.0.text');

        if (! is_string($text) || $text === '') {
            throw new RuntimeException('Gemini API returned an empty response.');
        }

        return $this->decodeJson($text);
    }

    /**
     * @return array<string, mixed>
     */
    private function decodeJson(string $text): array
    {
        $decoded = json_decode($text, true);

        if (! is_array($decoded)) {
            throw new RuntimeException('Gemini API returned invalid JSON.');
        }

        return $decoded;
    }
}
