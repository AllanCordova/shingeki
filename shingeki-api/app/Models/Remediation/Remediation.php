<?php

namespace App\Models\Remediation;

use App\Enums\Attack\AttackCategory;
use App\Enums\Attack\AttackScanType;
use App\Models\System\Stack;
use App\Models\User\User;
use Database\Factories\RemediationFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
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
        'user_id',
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

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    protected function codeSnippet(): Attribute
    {
        return Attribute::get(function (?string $value): ?string {
            if ($value === null) {
                return null;
            }

            return str_replace(['\\r\\n', '\\n', '\\t'], ["\n", "\n", "\t"], $value);
        });
    }
}
