<?php

namespace App\Models\Catalog;

use App\Enums\Catalog\AttackCategory;
use App\Enums\Catalog\AttackRiskLevel;
use App\Enums\Catalog\AttackTargetLocation;
use App\Enums\Scanning\AttackScanType;
use App\Models\Identity\User;
use App\Models\Scanning\SystemResult;
use Database\Factories\AttackFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Attack extends Model
{
    /** @use HasFactory<AttackFactory> */
    use HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'scan_type',
        'category',
        'payload',
        'target_location',
        'risk_level',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'scan_type' => AttackScanType::class,
            'category' => AttackCategory::class,
            'payload' => 'array',
            'target_location' => AttackTargetLocation::class,
            'risk_level' => AttackRiskLevel::class,
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function systemResults(): HasMany
    {
        return $this->hasMany(SystemResult::class);
    }
}
