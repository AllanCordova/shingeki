<?php

namespace App\Http\Controllers\Cover;

use App\Http\Controllers\Controller;
use App\Models\User\UserCoverUpload;
use App\Services\Cover\UserCoverLibraryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CoverUploadController extends Controller
{
    public function __construct(
        private readonly UserCoverLibraryService $coverLibrary,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $uploads = $this->coverLibrary->listForUser($user);

        return response()->json([
            'limit' => $this->coverLibrary->limit(),
            'count' => $uploads->count(),
            'cover_uploads' => $uploads->map(fn (UserCoverUpload $upload) => $this->formatUpload($upload)),
        ]);
    }

    public function destroy(Request $request, UserCoverUpload $coverUpload): JsonResponse
    {
        $this->coverLibrary->deleteUpload($request->user(), $coverUpload);

        return response()->json([
            'message' => 'Cover upload removed successfully.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function formatUpload(UserCoverUpload $upload): array
    {
        return [
            'id' => $upload->id,
            'path' => $upload->path,
            'created_at' => $upload->created_at,
            'updated_at' => $upload->updated_at,
        ];
    }
}
