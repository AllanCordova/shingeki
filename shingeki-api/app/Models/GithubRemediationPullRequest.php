<?php

namespace App\Models;

use Database\Factories\GithubRemediationPullRequestFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GithubRemediationPullRequest extends Model
{
    /** @use HasFactory<GithubRemediationPullRequestFactory> */
    use HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'system_id',
        'attack_dispatch_id',
        'user_id',
        'github_pr_number',
        'github_pr_url',
        'head_branch',
        'base_branch',
        'finding_ids',
        'files_changed',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'finding_ids' => 'array',
            'github_pr_number' => 'integer',
            'files_changed' => 'integer',
        ];
    }

    public function system(): BelongsTo
    {
        return $this->belongsTo(System::class);
    }

    public function attackDispatch(): BelongsTo
    {
        return $this->belongsTo(AttackDispatch::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
