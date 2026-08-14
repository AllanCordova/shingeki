<?php

namespace App\Models\Scanning;

use App\Models\Catalog\Attack;
use App\Models\Workspace\System;
use Database\Factories\SystemResultFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SystemResult extends Model
{
    /** @use HasFactory<SystemResultFactory> */
    use HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'system_id',
        'attack_dispatch_id',
        'attack_id',
        'vulnerable_route',
        'payload_used',
        'evidence',
        'http_request',
        'source_file',
        'start_line',
        'end_line',
        'matched_snippet',
        'dedupe_key',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'start_line' => 'integer',
            'end_line' => 'integer',
        ];
    }

    public function system(): BelongsTo
    {
        return $this->belongsTo(System::class);
    }

    public function attackDispatch(): BelongsTo
    {
        return $this->belongsTo(AttackDispatch::class);
    }

    public function attack(): BelongsTo
    {
        return $this->belongsTo(Attack::class);
    }
}
