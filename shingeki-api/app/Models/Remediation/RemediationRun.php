<?php

namespace App\Models\Remediation;

use App\Enums\Remediation\RemediationRunType;
use App\Models\Attack\AttackDispatch;
use App\Models\System\System;
use App\Models\User\User;
use Database\Factories\RemediationRunFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RemediationRun extends Model
{
    /** @use HasFactory<RemediationRunFactory> */
    use HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'system_id',
        'attack_dispatch_id',
        'user_id',
        'type',
        'findings_count',
        'provider',
        'model',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => RemediationRunType::class,
            'findings_count' => 'integer',
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

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
