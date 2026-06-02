<?php

namespace App\Services\Cover;

use App\Models\Project;
use App\Models\System;
use App\Models\User;
use App\Models\UserCoverUpload;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class UserCoverLibraryService
{
    public function __construct(
        private readonly CoverImageService $coverImages,
    ) {}

    public function limit(): int
    {
        return (int) config('covers.max_uploads_per_user', 20);
    }

    public function countForUser(User $user): int
    {
        return UserCoverUpload::query()->where('user_id', $user->id)->count();
    }

    /**
     * @return Collection<int, UserCoverUpload>
     */
    public function listForUser(User $user): Collection
    {
        return UserCoverUpload::query()
            ->where('user_id', $user->id)
            ->latest()
            ->get();
    }

    public function registerUpload(User $user, UploadedFile $file): UserCoverUpload
    {
        $this->assertCanAdd($user);

        $path = $this->coverImages->store($file);

        return UserCoverUpload::query()->create([
            'user_id' => $user->id,
            'path' => $path,
        ]);
    }

    public function resolvePathFromUploadId(User $user, string $coverUploadId): string
    {
        $upload = UserCoverUpload::query()
            ->where('user_id', $user->id)
            ->find($coverUploadId);

        if ($upload === null) {
            throw ValidationException::withMessages([
                'cover_upload_id' => ['Imagem da biblioteca nao encontrada.'],
            ]);
        }

        return $upload->path;
    }

    public function resolveCoverForCreate(User $user, ?UploadedFile $file, ?string $coverUploadId): string
    {
        if ($file !== null) {
            return $this->registerUpload($user, $file)->path;
        }

        if ($coverUploadId !== null) {
            return $this->resolvePathFromUploadId($user, $coverUploadId);
        }

        throw ValidationException::withMessages([
            'cover' => ['Envie uma imagem ou selecione uma da biblioteca.'],
        ]);
    }

    public function resolveCoverForUpdate(
        User $user,
        ?UploadedFile $file,
        ?string $coverUploadId,
    ): ?string {
        if ($file === null && $coverUploadId === null) {
            return null;
        }

        if ($file !== null) {
            return $this->registerUpload($user, $file)->path;
        }

        return $this->resolvePathFromUploadId($user, $coverUploadId);
    }

    public function deleteUpload(User $user, UserCoverUpload $upload): void
    {
        if ($this->isPathInUseByUser($user->id, $upload->path)) {
            throw ValidationException::withMessages([
                'cover_upload' => [
                    'Esta imagem esta em uso em um projeto ou sistema e nao pode ser removida.',
                ],
            ]);
        }

        $this->coverImages->delete($upload->path);
        $upload->delete();
    }

    public function releaseCoversForProject(Project $project): void
    {
        $paths = $this->collectPathsForProject($project);
        $userId = $project->user_id;

        $project->delete();

        foreach ($paths as $path) {
            $this->purgePathIfUnused($userId, $path);
        }
    }

    public function releaseCoverForSystem(System $system): void
    {
        $project = $system->project;
        $path = $system->cover_path;

        $system->delete();

        if ($project !== null) {
            $this->purgePathIfUnused($project->user_id, $path);
        }
    }

    public function isPathInUseByUser(string $userId, string $path): bool
    {
        if (Project::query()->where('user_id', $userId)->where('cover_path', $path)->exists()) {
            return true;
        }

        return System::query()
            ->where('cover_path', $path)
            ->whereHas('project', fn ($query) => $query->where('user_id', $userId))
            ->exists();
    }

    public function purgePathIfUnused(string $userId, ?string $path): void
    {
        if ($path === null || $path === '') {
            return;
        }

        if ($this->isPathInUseByUser($userId, $path)) {
            return;
        }

        UserCoverUpload::query()
            ->where('user_id', $userId)
            ->where('path', $path)
            ->delete();

        $this->coverImages->delete($path);
    }

    /**
     * @return list<string>
     */
    private function collectPathsForProject(Project $project): array
    {
        return collect([$project->cover_path])
            ->merge($project->systems()->pluck('cover_path'))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    private function assertCanAdd(User $user): void
    {
        $limit = $this->limit();

        if ($this->countForUser($user) >= $limit) {
            throw ValidationException::withMessages([
                'cover' => [
                    'Voce atingiu o limite de '.$limit.' imagens na biblioteca. Remova uma imagem antes de enviar outra.',
                ],
            ]);
        }
    }
}
