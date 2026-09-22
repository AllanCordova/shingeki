<?php

namespace App\Models\System;

use App\Enums\Attack\AttackScanType;
use App\Models\Attack\AttackDispatch;
use App\Models\Project\Project;
use App\Models\Signature\Signature;
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
        'login_username',
        'login_password',
        'logged_in_indicator',
        'repository_url',
        'dast_max_routes',
        'dast_start_path',
        'dast_attack_ids',
        'sast_attack_ids',
    ];

    /**
     * @var list<string>
     */
    protected $hidden = [
        'login_password',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'dast_max_routes' => 'integer',
            'dast_attack_ids' => 'array',
            'sast_attack_ids' => 'array',
            'login_username' => 'encrypted',
            'login_password' => 'encrypted',
        ];
    }

    public function hasScannerLogin(): bool
    {
        return filled($this->login_username) && filled($this->login_password);
    }

    /**
     * @return array{
     *     type: string,
     *     username: string,
     *     password: string,
     *     login_url?: string,
     *     logged_in_indicator?: string
     * }|null
     */
    public function queueAuth(): ?array
    {
        if (! $this->hasScannerLogin()) {
            return null;
        }

        $payload = [
            'type' => 'credentials',
            'username' => (string) $this->login_username,
            'password' => (string) $this->login_password,
        ];

        if (filled($this->login_url)) {
            $payload['login_url'] = $this->login_url;
        }

        if (filled($this->logged_in_indicator)) {
            $payload['logged_in_indicator'] = $this->logged_in_indicator;
        }

        return $payload;
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * @return list<string>|null
     */
    public function attackIdsFor(AttackScanType $scanType): ?array
    {
        $ids = $scanType === AttackScanType::Sast
            ? $this->sast_attack_ids
            : $this->dast_attack_ids;

        if (! is_array($ids) || $ids === []) {
            return null;
        }

        $filtered = array_values(array_filter(
            $ids,
            fn (mixed $id): bool => is_string($id) && $id !== '',
        ));

        return $filtered === [] ? null : $filtered;
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

        $query = static::query()->where($field ?? $this->getRouteKeyName(), $value);

        if ($project instanceof Project) {
            $query->where('project_id', $project->id);
        }

        return $query->first();
    }
}
