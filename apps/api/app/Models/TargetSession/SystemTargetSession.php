<?php

namespace App\Models\TargetSession;

use App\Enums\TargetSession\TargetAuthType;
use App\Models\System\System;
use App\Models\User\User;
use Database\Factories\SystemTargetSessionFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SystemTargetSession extends Model
{
    /** @use HasFactory<SystemTargetSessionFactory> */
    use HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'system_id',
        'auth_type',
        'headers',
        'storage',
        'expires_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'auth_type' => TargetAuthType::class,
            'headers' => 'encrypted:array',
            'storage' => 'encrypted:array',
            'expires_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function system(): BelongsTo
    {
        return $this->belongsTo(System::class);
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    /**
     * @return list<string>
     */
    public function headerNames(): array
    {
        return array_values(array_keys($this->headers ?? []));
    }

    /**
     * Counts only — never returns cookie values, tokens, or storage contents.
     *
     * @return array{cookie_count: int, route_count: int, has_storage: bool, has_user_agent: bool}
     */
    public function replayMeta(): array
    {
        $storage = $this->storage ?? [];
        $cookies = is_array($storage['cookies'] ?? null) ? $storage['cookies'] : [];
        $routes = is_array($storage['routes'] ?? null) ? $storage['routes'] : [];
        $local = is_array($storage['local'] ?? null) ? $storage['local'] : [];
        $session = is_array($storage['session'] ?? null) ? $storage['session'] : [];
        $origins = is_array($storage['origins'] ?? null) ? $storage['origins'] : [];

        return [
            'cookie_count' => count($cookies),
            'route_count' => count($routes),
            'has_storage' => $local !== [] || $session !== [] || $origins !== [],
            'has_user_agent' => filled($storage['user_agent'] ?? null),
        ];
    }
}
