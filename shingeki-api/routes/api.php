<?php

use App\Http\Controllers\Catalog\CatalogAttackController;
use App\Http\Controllers\Catalog\CatalogAttackImportController;
use App\Http\Controllers\Catalog\CatalogImportController;
use App\Http\Controllers\Catalog\CatalogRemediationController;
use App\Http\Controllers\Catalog\CatalogRemediationImportController;
use App\Http\Controllers\Catalog\StackController;
use App\Http\Controllers\Identity\AuthController;
use App\Http\Controllers\Identity\CoverUploadController;
use App\Http\Controllers\Notifications\UserNotificationController;
use App\Http\Controllers\Remediation\AiRemediationController;
use App\Http\Controllers\Remediation\GitHubRemediationController;
use App\Http\Controllers\Remediation\RemediationController;
use App\Http\Controllers\Remediation\RemediationHistoryController;
use App\Http\Controllers\Scanning\AttackController;
use App\Http\Controllers\Scanning\AuditReportController;
use App\Http\Controllers\Scanning\SystemResultController;
use App\Http\Controllers\TargetAccess\ManualProxyController;
use App\Http\Controllers\TargetAccess\SignatureController;
use App\Http\Controllers\TargetAccess\TargetSessionCaptureController;
use App\Http\Controllers\TargetAccess\TargetSessionController;
use App\Http\Controllers\Workspace\ProjectController;
use App\Http\Controllers\Workspace\SidebarNavigationController;
use App\Http\Controllers\Workspace\SystemController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:auth');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:auth');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::put('/me', [AuthController::class, 'update']);
    });
});

Route::post('target-session/capture/{ticket}', [TargetSessionCaptureController::class, 'complete'])
    ->middleware('throttle:target-session-capture');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('cover-uploads', [CoverUploadController::class, 'index']);
    Route::delete('cover-uploads/{coverUpload}', [CoverUploadController::class, 'destroy']);

    Route::get('navigation/sidebar', [SidebarNavigationController::class, 'show']);
    Route::put('navigation/sidebar', [SidebarNavigationController::class, 'update']);

    Route::get('stacks', [StackController::class, 'index']);

    Route::prefix('notifications')->group(function () {
        Route::get('/', [UserNotificationController::class, 'index']);
        Route::delete('/', [UserNotificationController::class, 'destroyAll']);
        Route::get('/unread-count', [UserNotificationController::class, 'unreadCount']);
        Route::post('/read-all', [UserNotificationController::class, 'markAllRead']);
        Route::patch('/{userNotification}/read', [UserNotificationController::class, 'markRead']);
        Route::delete('/{userNotification}', [UserNotificationController::class, 'destroy']);
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
    Route::get('projects/{project}/dashboard', [ProjectController::class, 'dashboard']);
    Route::apiResource('projects.systems', SystemController::class);

    Route::prefix('projects/{project}/systems/{system}/signatures')->group(function () {
        Route::post('/generate', [SignatureController::class, 'generate']);
        Route::post('/validate', [SignatureController::class, 'validate'])->middleware('throttle:signature-verify');
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
    Route::post('projects/{project}/systems/{system}/remediate/github-pr/preview', [GitHubRemediationController::class, 'previewPullRequest'])
        ->middleware('throttle:10,1');
    Route::post('projects/{project}/systems/{system}/remediate/github-pr', [GitHubRemediationController::class, 'openPullRequest'])
        ->middleware('throttle:5,1');

    Route::get('projects/{project}/systems/{system}/remediation-history', [RemediationHistoryController::class, 'index']);

    Route::get('projects/{project}/systems/{system}/system-results', [SystemResultController::class, 'index']);
    Route::get('projects/{project}/systems/{system}/system-results/compare', [SystemResultController::class, 'compare']);
    Route::delete('projects/{project}/systems/{system}/system-results', [SystemResultController::class, 'deleteAll']);
    Route::get('projects/{project}/systems/{system}/system-results/{attack_dispatch}', [SystemResultController::class, 'show']);
    Route::get('projects/{project}/systems/{system}/system-results/{attack_dispatch}/export', [AuditReportController::class, 'export']);
    Route::delete('projects/{project}/systems/{system}/system-results/{attack_dispatch}', [SystemResultController::class, 'destroy']);
});
