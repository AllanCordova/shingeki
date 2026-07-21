<?php

namespace App\Services\User;

use App\Models\User\User;
use App\Services\Cover\CoverImageService;
use App\Services\Cover\UserCoverLibraryService;
use Illuminate\Http\UploadedFile;

/**
 * Avatar do usuario. Novos arquivos sempre entram pela biblioteca
 * ({@see UserCoverLibraryService::registerUpload}) — nao grave em disco
 * fora desse fluxo.
 */
class UserAvatarService
{
    public function __construct(
        private readonly CoverImageService $images,
        private readonly UserCoverLibraryService $coverLibrary,
    ) {}

    public function replaceFromFile(User $user, UploadedFile $file): string
    {
        $previous = $user->avatar_path;
        $upload = $this->coverLibrary->registerUpload($user, $file, 'avatar');

        $this->deleteLegacyOrphanAvatar($previous);

        return $upload->path;
    }

    public function replaceFromLibraryUploadId(User $user, string $uploadId): string
    {
        $this->deleteLegacyOrphanAvatar($user->avatar_path);

        return $this->coverLibrary->resolvePathFromUploadId($user, $uploadId);
    }

    public function remove(User $user): void
    {
        $previous = $user->avatar_path;
        $user->forceFill(['avatar_path' => null])->save();
        $this->deleteLegacyOrphanAvatar($previous);
    }

    /**
     * Avatares antigos (pre-biblioteca) viviam so em /storage/avatars/.
     * Paths da biblioteca nao sao apagados aqui — a lib/purge cuida disso.
     */
    private function deleteLegacyOrphanAvatar(?string $path): void
    {
        if (! is_string($path) || ! str_starts_with($path, '/storage/avatars/')) {
            return;
        }

        $this->images->delete($path);
    }
}
