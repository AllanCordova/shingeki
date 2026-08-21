<?php

namespace App\Http\Controllers\System;

use App\Http\Controllers\Controller;
use App\Models\System\Stack;
use Illuminate\Http\JsonResponse;

class StackController extends Controller
{
    public function index(): JsonResponse
    {
        $stacks = Stack::query()->orderBy('name')->get();

        return response()->json([
            'stacks' => $stacks
                ->map(fn (Stack $stack) => [
                    'id' => $stack->id,
                    'slug' => $stack->slug,
                    'name' => $stack->name,
                    'languages' => $stack->languages,
                ])
                ->values()
                ->all(),
        ]);
    }
}
