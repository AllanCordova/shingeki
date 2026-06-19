<?php

namespace App\Models;

use Database\Factories\AiRemediationSuggestionFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiRemediationSuggestion extends Model
{
    /** @use HasFactory<AiRemediationSuggestionFactory> */
    use HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'system_result_id',
        'attack_dispatch_id',
        'provider',
        'model',
        'prompt_hash',
        'response_json',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'response_json' => 'array',
        ];
    }

    public function systemResult(): BelongsTo
    {
        return $this->belongsTo(SystemResult::class);
    }

    public function attackDispatch(): BelongsTo
    {
        return $this->belongsTo(AttackDispatch::class);
    }
}
