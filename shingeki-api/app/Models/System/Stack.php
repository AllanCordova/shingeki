<?php

namespace App\Models\System;

use App\Models\Remediation\Remediation;
use Database\Factories\StackFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Stack extends Model
{
    /** @use HasFactory<StackFactory> */
    use HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'slug',
        'name',
        'languages',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'languages' => 'array',
        ];
    }

    public function systems(): BelongsToMany
    {
        return $this->belongsToMany(System::class, 'system_stack')
            ->withPivot('is_primary');
    }

    public function remediations(): HasMany
    {
        return $this->hasMany(Remediation::class);
    }
}
