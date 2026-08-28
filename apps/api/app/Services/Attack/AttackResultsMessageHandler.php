<?php

namespace App\Services\Attack;

use App\Models\Attack\AttackDispatch;
use App\Models\Attack\DispatchProbe;
use App\Models\System\SystemResult;

class AttackResultsMessageHandler
{
    public function __construct(
        private readonly AttackResultProcessor $resultProcessor,
        private readonly AttackProbeProcessor $probeProcessor,
        private readonly AttackDispatchCompletionProcessor $completionProcessor,
    ) {}

    /**
     * @param  array<string, mixed>  $message
     */
    public function handle(array $message): SystemResult|DispatchProbe|AttackDispatch
    {
        $payload = $message['payload'] ?? $message;
        $event = $payload['event'] ?? 'attack.result';

        if ($event === AttackDispatchCompletionProcessor::EVENT) {
            return $this->completionProcessor->process($payload);
        }

        if ($event === AttackProbeProcessor::EVENT) {
            return $this->probeProcessor->process($payload);
        }

        return $this->resultProcessor->process($payload);
    }
}
