<?php

namespace App\Http\Resources\Workspace;

use App\Models\Workspace\System;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin System
 */
class SystemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'cover_path' => $this->cover_path,
            'name' => $this->name,
            'target_url' => $this->target_url,
            'login_url' => $this->login_url,
            'repository_url' => $this->repository_url,
            'stacks' => $this->relationLoaded('stacks')
                ? $this->stacks
                    ->map(fn ($stack) => [
                        'id' => $stack->id,
                        'slug' => $stack->slug,
                        'name' => $stack->name,
                        'is_primary' => (bool) $stack->pivot->is_primary,
                    ])
                    ->values()
                    ->all()
                : [],
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
