<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\SignatureController;
use App\Http\Controllers\SystemController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::put('/me', [AuthController::class, 'update']);
    });
});

Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('projects', ProjectController::class);
    Route::apiResource('projects.systems', SystemController::class);

    Route::prefix('projects/{project}/systems/{system}/signatures')->group(function () {
        Route::post('/generate', [SignatureController::class, 'generate']);
        Route::post('/validate', [SignatureController::class, 'validate']);
        Route::post('/revoke', [SignatureController::class, 'revoke']);
    });
});
