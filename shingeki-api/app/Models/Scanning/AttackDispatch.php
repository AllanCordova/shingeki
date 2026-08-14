<?php

namespace App\Models\Scanning;

use App\Enums\Scanning\AttackScanType;
use App\Models\Identity\User;
use App\Models\Workspace\System;
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
    protected $fillable = [
        'system_id',
        'user_id',
        'scan_type',
        'attacks_count',
        'dispatched_at',
        'completed_at',
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
            'dispatched_at' => 'datetime',
            'completed_at' => 'datetime',
            'duration_ms' => 'integer',
            'findings_count' => 'integer',
            'probes_count' => 'integer',
            'vectors_discovered' => 'integer',
            'jobs_planned' => 'integer',
        ];
    }

    /** @return BelongsTo<System, $this> */
    public function system(): BelongsTo
    {
        return $this->belongsTo(System::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return HasMany<SystemResult, $this> */
    public function systemResults(): HasMany
    {
        return $this->hasMany(SystemResult::class);
    }

    /** @return HasMany<DispatchProbe, $this> */
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
}
