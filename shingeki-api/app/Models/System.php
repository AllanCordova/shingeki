<?php

namespace App\Models;

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
        'repository_url',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function signatures(): HasMany
    {
        return $this->hasMany(Signature::class);
    }

    public function systemResults(): HasMany
    {
        return $this->hasMany(SystemResult::class);
    }

    public function attackDispatches(): HasMany
    {
        return $this->hasMany(AttackDispatch::class);
    }

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
}
