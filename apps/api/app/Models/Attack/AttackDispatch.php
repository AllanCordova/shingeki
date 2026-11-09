<?php

namespace App\Models\Attack;

use App\Enums\Attack\AttackDepth;
use App\Enums\Attack\AttackScanType;
use App\Models\System\System;
use App\Models\System\SystemResult;
use App\Models\User\User;
use Database\Factories\AttackDispatchFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AttackDispatch extends Model
{
    /** @use HasFactory<AttackDispatchFactory> */
    use HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @var list<string>
     */
    protected $hidden = [
        'browser_state',
    ];

    /**
     * @var list<string>
     */
    protected $fillable = [
        'system_id',
        'user_id',
        'scan_type',
        'depth',
        'start_path',
        'max_routes',
        'route_map',
        'browser_state',
        'attacks_count',
        'dispatched_at',
        'completed_at',
        'failed_at',
        'session_expired_at',
        'cancelled_at',
        'failure_reason',
        'duration_ms',
        'findings_count',
        'probes_count',
        'vectors_discovered',
        'jobs_planned',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'scan_type' => AttackScanType::class,
            'depth' => AttackDepth::class,
            'max_routes' => 'integer',
            'route_map' => 'array',
            'browser_state' => 'array',
            'dispatched_at' => 'datetime',
            'completed_at' => 'datetime',
            'failed_at' => 'datetime',
            'session_expired_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'duration_ms' => 'integer',
            'findings_count' => 'integer',
            'probes_count' => 'integer',
            'vectors_discovered' => 'integer',
            'jobs_planned' => 'integer',
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

    public function systemResults(): HasMany
    {
        return $this->hasMany(SystemResult::class);
    }

    public function dispatchProbes(): HasMany
    {
        return $this->hasMany(DispatchProbe::class);
    }

    /**
     * @param  mixed  $value
     * @param  string|null  $field
     */
    public function resolveRouteBinding($value, $field = null): ?static
    {
        $system = request()->route('system');

        if (! $system instanceof System) {
            return null;
        }

        return static::query()
            ->where($field ?? $this->getRouteKeyName(), $value)
            ->where('system_id', $system->id)
            ->first();
    }

    public function scanStatus(): string
    {
        if ($this->cancelled_at !== null) {
            return 'cancelled';
        }

        if ($this->session_expired_at !== null) {
            return 'session_expired';
        }

        if ($this->failed_at !== null) {
            return 'failed';
        }

        if ($this->completed_at !== null) {
            return 'completed';
        }

        return 'pending';
    }
}
