<?php

namespace App\Models\Attack;

use App\Models\System\System;
use App\Models\User\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BrowserCaptureSession extends Model
{
    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'system_id',
        'user_id',
        'token_hash',
        'expires_at',
        'consumed_at',
        'depth',
        'start_path',
        'max_routes',
        'route_map',
        'attack_ids',
        'terms_version',
        'ip_address',
        'user_agent',
        'browser_opened_at',
        'browser_opened_ip',
        'browser_opened_user_agent',
        'source',
        'attack_dispatch_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'consumed_at' => 'datetime',
            'browser_opened_at' => 'datetime',
            'max_routes' => 'integer',
            'route_map' => 'array',
            'attack_ids' => 'array',
        ];
    }

    public function system(): BelongsTo
    {
        return $this->belongsTo(System::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function attackDispatch(): BelongsTo
    {
        return $this->belongsTo(AttackDispatch::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(BrowserCaptureEvent::class);
    }

    public function status(): string
    {
        if ($this->consumed_at !== null) {
            return 'completed';
        }

        if ($this->expires_at !== null && $this->expires_at->isPast()) {
            return 'expired';
        }

        return 'pending';
    }
}
