<?php

namespace App\Services\Cover;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CoverImageService
{
    public function store(UploadedFile $file, string $directory = 'covers'): string
    {
        $filename = Str::uuid().'.'.$file->guessExtension();
        $file->storeAs($directory, $filename, 'public');

        return '/storage/'.$directory.'/'.$filename;
    }

    public function delete(?string $coverPath): void
    {
        if ($coverPath === null || $coverPath === '') {
            return;
        }

        $relative = $this->toStorageRelativePath($coverPath);

        if ($relative !== null && Storage::disk('public')->exists($relative)) {
            Storage::disk('public')->delete($relative);
        }
    }

    private function toStorageRelativePath(string $coverPath): ?string
    {
        $normalized = '/'.ltrim($coverPath, '/');

        if (! str_starts_with($normalized, '/storage/')) {
            return null;
        }

        return ltrim(Str::after($normalized, '/storage/'), '/');
    }
}
