<?php

namespace App\Models\Scanning;

use App\Enums\Scanning\DispatchProbeOutcome;
use App\Models\Catalog\Attack;
use App\Models\Workspace\System;
use Database\Factories\DispatchProbeFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DispatchProbe extends Model
{
    /** @use HasFactory<DispatchProbeFactory> */
    use HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'attack_dispatch_id',
        'system_id',
        'attack_id',
        'route',
        'payload_used',
        'http_request',
        'outcome',
        'evidence',
        'error_message',
        'dedupe_key',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'outcome' => DispatchProbeOutcome::class,
        ];
    }

    public function attackDispatch(): BelongsTo
    {
        return $this->belongsTo(AttackDispatch::class);
    }

    public function system(): BelongsTo
    {
        return $this->belongsTo(System::class);
    }

    public function attack(): BelongsTo
    {
        return $this->belongsTo(Attack::class);
    }
}
