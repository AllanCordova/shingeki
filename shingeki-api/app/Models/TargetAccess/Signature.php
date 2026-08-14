<?php

namespace App\Models\TargetAccess;

use App\Enums\TargetAccess\SignatureStatus;
use App\Models\Identity\User;
use App\Models\Workspace\System;
use App\Services\TargetAccess\Signature\SignatureStatusService;
use Database\Factories\SignatureFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Signature extends Model
{
    /** @use HasFactory<SignatureFactory> */
    use HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'system_id',
        'ip_address',
        'token',
        'status',
        'expiration',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => SignatureStatus::class,
            'expiration' => 'date',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<System, $this> */
    public function system(): BelongsTo
    {
        return $this->belongsTo(System::class);
    }

    public function permit(): void
    {
        $this->setStatus(SignatureStatus::Permitted);
    }

    public function deny(): void
    {
        $this->setStatus(SignatureStatus::Denied);
    }

    public function revoke(): void
    {
        $this->delete();
    }

    public function setStatus(SignatureStatus|string $status): void
    {
        $this->update([
            'status' => app(SignatureStatusService::class)->resolve($status),
        ]);
    }
}
