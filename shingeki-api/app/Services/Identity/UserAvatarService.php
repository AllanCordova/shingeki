<?php

namespace App\Services\Identity;

use App\Models\Identity\User;
use Illuminate\Http\UploadedFile;

class UserAvatarService
{
    public function __construct(
        private readonly CoverImageService $images,
        private readonly UserCoverLibraryService $coverLibrary,
    ) {}

    public function replaceFromFile(User $user, UploadedFile $file): string
    {
        $this->images->delete($user->avatar_path);

        return $this->images->store($file, 'avatars');
    }

    public function replaceFromLibraryUploadId(User $user, string $uploadId): string
    {
        if (str_starts_with((string) $user->avatar_path, '/storage/avatars/')) {
            $this->images->delete($user->avatar_path);
        }

        return $this->coverLibrary->resolvePathFromUploadId($user, $uploadId);
    }

    public function remove(User $user): void
    {
        if (! str_starts_with((string) $user->avatar_path, '/storage/avatars/')) {
            $user->forceFill(['avatar_path' => null])->save();

            return;
        }

        $this->images->delete($user->avatar_path);
        $user->forceFill(['avatar_path' => null])->save();
    }
}
