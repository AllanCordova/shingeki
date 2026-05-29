<?php

namespace App\Services\Attack;

use App\Models\AttackDispatch;
use App\Models\SystemResult;

class AttackResultsMessageHandler
{
    public function __construct(
        private readonly AttackResultProcessor $resultProcessor,
        private readonly AttackDispatchCompletionProcessor $completionProcessor,
    ) {}

    /**
     * @param  array<string, mixed>  $message
     */
    public function handle(array $message): SystemResult|AttackDispatch
    {
        $payload = $message['payload'] ?? $message;
        $event = $payload['event'] ?? 'attack.result';

        if ($event === AttackDispatchCompletionProcessor::EVENT) {
            return $this->completionProcessor->process($payload);
        }

        return $this->resultProcessor->process($payload);
    }
}
