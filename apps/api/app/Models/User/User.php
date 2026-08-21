<?php

namespace App\Models\User;

use App\Enums\User\UserRole;
use App\Models\Attack\Attack;
use App\Models\Project\Project;
use App\Models\Signature\Signature;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasUuids, Notifiable;

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'google_id',
        'avatar_path',
        'password',
        'role',
    ];

    /**
     * @var list<string>
     */
    protected $hidden = [
        'password',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'role' => UserRole::class,
        ];
    }

    public function isCatalogManager(): bool
    {
        return $this->role->canManageCatalog();
    }

    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }

    public function signatures(): HasMany
    {
        return $this->hasMany(Signature::class);
    }

    public function attacks(): HasMany
    {
        return $this->hasMany(Attack::class);
    }

    public function coverUploads(): HasMany
    {
        return $this->hasMany(UserCoverUpload::class);
    }
}
