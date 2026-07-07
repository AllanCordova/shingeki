<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesRemediationDispatch;
use App\Http\Requests\OpenGitHubRemediationPr;
use App\Models\Project;
use App\Models\System;
use App\Services\GitHub\GitHubRemediationService;
use Illuminate\Http\JsonResponse;
use InvalidArgumentException;
use RuntimeException;

class GitHubRemediationController extends Controller
{
    use ResolvesRemediationDispatch;

    public function __construct(
        private readonly GitHubRemediationService $githubRemediationService,
    ) {}

    public function openPullRequest(
        OpenGitHubRemediationPr $request,
        Project $project,
        System $system,
    ): JsonResponse {
        return $this->respond(
            $request,
            $system,
            function (System $system, $dispatch) use ($request) {
                return $this->githubRemediationService->openPullRequest(
                    $system,
                    $dispatch,
                    $request->user(),
                    $request->validated('finding_ids'),
                    (bool) $request->boolean('regenerate'),
                    $request->validated('title'),
                    $request->validated('base_branch'),
                );
            },
            'GitHub pull request created successfully.',
            201,
        );
    }

    public function previewPullRequest(
        OpenGitHubRemediationPr $request,
        Project $project,
        System $system,
    ): JsonResponse {
        return $this->respond(
            $request,
            $system,
            function (System $system, $dispatch) use ($request) {
                return $this->githubRemediationService->previewPullRequest(
                    $system,
                    $dispatch,
                    $request->validated('finding_ids'),
                    (bool) $request->boolean('regenerate'),
                    $request->validated('title'),
                    $request->validated('base_branch'),
                );
            },
            'GitHub pull request preview generated.',
            200,
        );
    }

    /**
     * @param  callable(System, mixed): array<string, mixed>  $action
     */
    private function respond(
        OpenGitHubRemediationPr $request,
        System $system,
        callable $action,
        string $message,
        int $status,
    ): JsonResponse {
        $this->authorize('remediate', $system);

        $system->load('stacks');

        if ($system->stacks->isEmpty()) {
            return $this->emptyStacksResponse();
        }

        if (blank($system->repository_url)) {
            return response()->json([
                'message' => 'System repository_url is required to open a GitHub pull request.',
            ], 422);
        }

        $dispatch = $this->resolveDispatch($system, $request->validated('dispatch_id'));

        if ($dispatch === null) {
            return $this->missingDispatchResponse();
        }

        try {
            $result = $action($system, $dispatch);
        } catch (InvalidArgumentException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 503);
        }

        return response()->json([
            'message' => $message,
            'system_id' => $system->id,
            'dispatch_id' => $dispatch->id,
            ...$result,
        ], $status);
    }
}
