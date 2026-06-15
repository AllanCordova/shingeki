<?php

namespace App\Models;

use App\Enums\AttackCategory;
use App\Enums\AttackScanType;
use Database\Factories\RemediationFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Remediation extends Model
{
    /** @use HasFactory<RemediationFactory> */
    use HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'stack_id',
        'scan_type',
        'attack_category',
        'semgrep_rule_id',
        'title',
        'description',
        'code_snippet',
        'references',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'scan_type' => AttackScanType::class,
            'attack_category' => AttackCategory::class,
            'references' => 'array',
        ];
    }

    public function stack(): BelongsTo
    {
        return $this->belongsTo(Stack::class);
    }
}
