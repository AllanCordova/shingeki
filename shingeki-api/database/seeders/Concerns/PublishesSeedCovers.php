<?php

namespace Database\Seeders\Concerns;

use Illuminate\Support\Facades\Storage;
use RuntimeException;

trait PublishesSeedCovers
{
    private function publishSeedCover(string $filename): string
    {
        $source = database_path('seeders/assets/covers/'.$filename);

        if (! is_file($source)) {
            throw new RuntimeException("Seed cover asset missing: {$source}");
        }

        Storage::disk('public')->put(
            'covers/'.$filename,
            file_get_contents($source),
        );

        return '/storage/covers/'.$filename;
    }
}
