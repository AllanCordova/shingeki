<?php

namespace App\Services\Catalog\Import;

use App\Enums\Catalog\AttackCategory;
use App\Enums\Catalog\AttackRiskLevel;
use App\Enums\Catalog\AttackTargetLocation;
use App\Enums\Scanning\AttackScanType;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class CatalogAttackRowValidator
{
    /**
     * @param  array<string, string>  $row
     * @return array{data: array<string, mixed>|null, errors: list<string>}
     */
    public function validate(array $row): array
    {
        $payloadRaw = $row['payload_json'] ?? '';
        $payload = json_decode($payloadRaw, true);
        $payloadValid = is_array($payload) && ! array_is_list($payload);

        $validator = Validator::make([
            'scan_type' => $row['scan_type'] ?? '',
            'category' => $row['category'] ?? '',
            'target_location' => $row['target_location'] ?? '',
            'risk_level' => $row['risk_level'] ?? '',
            'payload' => $payloadValid ? $payload : null,
        ], [
            'scan_type' => ['required', Rule::enum(AttackScanType::class)],
            'category' => ['required', Rule::enum(AttackCategory::class)],
            'target_location' => ['required', Rule::enum(AttackTargetLocation::class)],
            'risk_level' => ['required', Rule::enum(AttackRiskLevel::class)],
            'payload' => ['required', 'array'],
        ]);

        if (! $payloadValid && ($row['payload_json'] ?? '') !== '') {
            $validator->errors()->add('payload_json', 'payload_json must be a valid JSON object.');
        }

        if ($validator->fails()) {
            return [
                'data' => null,
                'errors' => collect($validator->errors()->all())->values()->all(),
            ];
        }

        /** @var array<string, mixed> $validated */
        $validated = $validator->validated();

        return [
            'data' => $validated,
            'errors' => [],
        ];
    }
}
