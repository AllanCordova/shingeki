<?php

namespace App\Models\Workspace;

use App\Models\Catalog\Stack;
use App\Models\Identity\User;
use App\Models\Scanning\AttackDispatch;
use App\Models\Scanning\SystemResult;
use App\Models\TargetAccess\Signature;
use App\Models\TargetAccess\SystemTargetSession;
use Database\Factories\SystemFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class System extends Model
{
    /** @use HasFactory<SystemFactory> */
    use HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'project_id',
        'cover_path',
        'name',
        'target_url',
        'login_url',
        'repository_url',
    ];

    /** @return BelongsTo<Project, $this> */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /** @return HasMany<Signature, $this> */
    public function signatures(): HasMany
    {
        return $this->hasMany(Signature::class);
    }

    /** @return HasMany<SystemResult, $this> */
    public function systemResults(): HasMany
    {
        return $this->hasMany(SystemResult::class);
    }

    /** @return HasMany<AttackDispatch, $this> */
    public function attackDispatches(): HasMany
    {
        return $this->hasMany(AttackDispatch::class);
    }

    /** @return HasMany<SystemTargetSession, $this> */
    public function targetSessions(): HasMany
    {
        return $this->hasMany(SystemTargetSession::class);
    }

    /** @return BelongsToMany<Stack, $this> */
    public function stacks(): BelongsToMany
    {
        return $this->belongsToMany(Stack::class, 'system_stack')
            ->withPivot('is_primary');
    }

    /**
     * @param  mixed  $value
     * @param  string|null  $field
     */
    public function resolveRouteBinding($value, $field = null): ?static
    {
        $project = request()->route('project');

        if (! $project instanceof Project) {
            return null;
        }

        return static::query()
            ->where($field ?? $this->getRouteKeyName(), $value)
            ->where('project_id', $project->id)
            ->first();
    }

    public function isOwnedBy(User $user): bool
    {
        $this->loadMissing('project');

        return $this->project !== null && $this->project->user_id === $user->id;
    }
}
