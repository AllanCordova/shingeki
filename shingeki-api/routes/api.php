<?php

use App\Http\Controllers\AttackController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CoverUploadController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\RemediationController;
use App\Http\Controllers\SignatureController;
use App\Http\Controllers\StackController;
use App\Http\Controllers\SystemController;
use App\Http\Controllers\SystemResultController;
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
    Route::get('cover-uploads', [CoverUploadController::class, 'index']);
    Route::delete('cover-uploads/{coverUpload}', [CoverUploadController::class, 'destroy']);

    Route::get('stacks', [StackController::class, 'index']);

    Route::apiResource('projects', ProjectController::class);
    Route::apiResource('projects.systems', SystemController::class);

    Route::prefix('projects/{project}/systems/{system}/signatures')->group(function () {
        Route::post('/generate', [SignatureController::class, 'generate']);
        Route::post('/validate', [SignatureController::class, 'validate']);
        Route::post('/revoke', [SignatureController::class, 'revoke']);
    });

    Route::post('projects/{project}/systems/{system}/attacks/dispatch', [AttackController::class, 'dispatch']);
    Route::post('projects/{project}/systems/{system}/attacks/dispatch/sast', [AttackController::class, 'dispatchSast']);
    Route::post('projects/{project}/systems/{system}/remediate', [RemediationController::class, 'remediate']);

    Route::get('projects/{project}/systems/{system}/system-results', [SystemResultController::class, 'index']);
    Route::delete('projects/{project}/systems/{system}/system-results', [SystemResultController::class, 'deleteAll']);
    Route::get('projects/{project}/systems/{system}/system-results/{attack_dispatch}', [SystemResultController::class, 'show']);
    Route::delete('projects/{project}/systems/{system}/system-results/{attack_dispatch}', [SystemResultController::class, 'destroy']);
});
