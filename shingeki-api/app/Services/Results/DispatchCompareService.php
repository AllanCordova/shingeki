<?php

namespace App\Services\Results;

use App\Models\Attack\AttackDispatch;
use App\Models\System\SystemResult;
use Illuminate\Support\Collection;

class DispatchCompareService
{
    /**
     * @return array<string, mixed>
     */
    public function compare(AttackDispatch $baseline, AttackDispatch $target): array
    {
        $baselineFindings = $this->loadFindings($baseline);
        $targetFindings = $this->loadFindings($target);

        $baselineMap = $baselineFindings->keyBy(fn (SystemResult $result) => $this->fingerprint($result));
        $targetMap = $targetFindings->keyBy(fn (SystemResult $result) => $this->fingerprint($result));

        $newKeys = $targetMap->keys()->diff($baselineMap->keys());
        $resolvedKeys = $baselineMap->keys()->diff($targetMap->keys());
        $persistedKeys = $baselineMap->keys()->intersect($targetMap->keys());

        return [
            'baseline' => $this->formatDispatch($baseline),
            'target' => $this->formatDispatch($target),
            'summary' => [
                'new' => $newKeys->count(),
                'resolved' => $resolvedKeys->count(),
                'persisted' => $persistedKeys->count(),
            ],
            'new_findings' => $newKeys
                ->map(fn (string $key) => $this->formatFinding($targetMap->get($key)))
                ->values()
                ->all(),
            'resolved_findings' => $resolvedKeys
                ->map(fn (string $key) => $this->formatFinding($baselineMap->get($key)))
                ->values()
                ->all(),
            'persisted_findings' => $persistedKeys
                ->map(fn (string $key) => $this->formatFinding($targetMap->get($key)))
                ->values()
                ->all(),
        ];
    }

    /**
     * @return Collection<int, SystemResult>
     */
    private function loadFindings(AttackDispatch $dispatch): Collection
    {
        return SystemResult::query()
            ->with('attack')
            ->where('attack_dispatch_id', $dispatch->id)
            ->get();
    }

    private function fingerprint(SystemResult $result): string
    {
        return hash('sha256', implode('|', [
            $result->attack_id ?? '',
            $result->vulnerable_route ?? '',
            $result->source_file ?? '',
            (string) ($result->start_line ?? ''),
            mb_substr($result->payload_used ?? '', 0, 200),
        ]));
    }

    /**
     * @return array<string, mixed>
     */
    private function formatDispatch(AttackDispatch $dispatch): array
    {
        return [
            'id' => $dispatch->id,
            'dispatched_at' => $dispatch->dispatched_at,
            'findings_count' => $dispatch->findings_count,
            'scan_type' => $dispatch->scan_type->value,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function formatFinding(SystemResult $result): array
    {
        $data = [
            'id' => $result->id,
            'vulnerable_route' => $result->vulnerable_route,
            'payload_used' => $result->payload_used,
            'evidence' => $result->evidence,
            'source_file' => $result->source_file,
            'start_line' => $result->start_line,
        ];

        if ($result->relationLoaded('attack') && $result->attack !== null) {
            $data['attack'] = [
                'category' => $result->attack->category->value,
                'risk_level' => $result->attack->risk_level->value,
            ];
        }

        return $data;
    }
}
