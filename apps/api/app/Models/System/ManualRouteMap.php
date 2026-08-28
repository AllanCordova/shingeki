<?php

namespace App\Models\System;

use App\Models\User\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ManualRouteMap extends Model
{
    use HasFactory;
    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'system_id',
        'user_id',
        'name',
        'method',
        'path',
        'query',
        'headers',
        'body',
        'content_type',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'query' => 'array',
            'headers' => 'array',
        ];
    }

    public function system(): BelongsTo
    {
        return $this->belongsTo(System::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
