<?php

namespace App\Models;

use Database\Factories\SystemFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
