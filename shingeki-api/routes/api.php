<?php

use App\Http\Controllers\AiRemediationController;
use App\Http\Controllers\AttackController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CatalogAttackController;
use App\Http\Controllers\CatalogAttackImportController;
use App\Http\Controllers\CatalogImportController;
use App\Http\Controllers\CatalogRemediationController;
use App\Http\Controllers\CatalogRemediationImportController;
use App\Http\Controllers\CoverUploadController;
use App\Http\Controllers\ManualProxyController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\RemediationController;
use App\Http\Controllers\SignatureController;
use App\Http\Controllers\StackController;
use App\Http\Controllers\SystemController;
use App\Http\Controllers\SystemResultController;
use App\Http\Controllers\TargetSessionCaptureController;
use App\Http\Controllers\TargetSessionController;
use App\Http\Controllers\UserNotificationController;
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

Route::post('target-session/capture/{ticket}', [TargetSessionCaptureController::class, 'complete']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('cover-uploads', [CoverUploadController::class, 'index']);
    Route::delete('cover-uploads/{coverUpload}', [CoverUploadController::class, 'destroy']);

    Route::get('stacks', [StackController::class, 'index']);

    Route::prefix('notifications')->group(function () {
        Route::get('/', [UserNotificationController::class, 'index']);
        Route::get('/unread-count', [UserNotificationController::class, 'unreadCount']);
        Route::post('/read-all', [UserNotificationController::class, 'markAllRead']);
        Route::patch('/{userNotification}/read', [UserNotificationController::class, 'markRead']);
    });

    Route::middleware('role:ADMIN,SPECIALIST')->prefix('catalog')->group(function () {
        Route::apiResource('attacks', CatalogAttackController::class);
        Route::apiResource('remediations', CatalogRemediationController::class);
        Route::get('attacks/import/template', [CatalogAttackImportController::class, 'template']);
        Route::post('attacks/import', [CatalogAttackImportController::class, 'store']);
        Route::get('remediations/import/template', [CatalogRemediationImportController::class, 'template']);
        Route::post('remediations/import', [CatalogRemediationImportController::class, 'store']);
        Route::get('imports/{import}', [CatalogImportController::class, 'show']);
    });

    Route::apiResource('projects', ProjectController::class);
    Route::apiResource('projects.systems', SystemController::class);

    Route::prefix('projects/{project}/systems/{system}/signatures')->group(function () {
        Route::post('/generate', [SignatureController::class, 'generate']);
        Route::post('/validate', [SignatureController::class, 'validate']);
        Route::post('/revoke', [SignatureController::class, 'revoke']);
    });

    Route::prefix('projects/{project}/systems/{system}/target-session')->group(function () {
        Route::get('/', [TargetSessionController::class, 'show']);
        Route::post('/', [TargetSessionController::class, 'store']);
        Route::post('/connect/start', [TargetSessionController::class, 'connectStart']);
        Route::delete('/', [TargetSessionController::class, 'destroy']);
    });

    Route::prefix('projects/{project}/systems/{system}/manual-proxy')->middleware('role:ADMIN,SPECIALIST')->group(function () {
        Route::post('/send', [ManualProxyController::class, 'send'])->middleware('throttle:30,1');
        Route::get('/routes', [ManualProxyController::class, 'indexRoutes']);
        Route::post('/routes', [ManualProxyController::class, 'storeRoute']);
        Route::put('/routes/{manualRouteMap}', [ManualProxyController::class, 'updateRoute']);
        Route::delete('/routes/{manualRouteMap}', [ManualProxyController::class, 'destroyRoute']);
    });

    Route::post('projects/{project}/systems/{system}/attacks/dispatch', [AttackController::class, 'dispatch']);
    Route::post('projects/{project}/systems/{system}/attacks/dispatch/sast', [AttackController::class, 'dispatchSast']);
    Route::post('projects/{project}/systems/{system}/remediate', [RemediationController::class, 'remediate']);
    Route::post('projects/{project}/systems/{system}/remediate/ai', [AiRemediationController::class, 'remediate'])
        ->middleware('throttle:10,1');

    Route::get('projects/{project}/systems/{system}/system-results', [SystemResultController::class, 'index']);
    Route::delete('projects/{project}/systems/{system}/system-results', [SystemResultController::class, 'deleteAll']);
    Route::get('projects/{project}/systems/{system}/system-results/{attack_dispatch}', [SystemResultController::class, 'show']);
    Route::delete('projects/{project}/systems/{system}/system-results/{attack_dispatch}', [SystemResultController::class, 'destroy']);
});
