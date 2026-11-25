<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Admin\AdminOpsStatusService;
use Illuminate\Http\JsonResponse;

class AdminOpsController extends Controller
{
    public function __construct(
        private readonly AdminOpsStatusService $ops,
    ) {}

    public function status(): JsonResponse
    {
        return response()->json($this->ops->status());
    }
}
