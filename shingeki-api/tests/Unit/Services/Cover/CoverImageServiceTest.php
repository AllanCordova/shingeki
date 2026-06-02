<?php

use App\Services\Cover\CoverImageService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('public');
    $this->service = new CoverImageService;
});

test('store saves file on public disk and returns storage path', function () {
    $path = $this->service->store(
        UploadedFile::fake()->create('cover.jpg', 100, 'image/jpeg'),
    );

    expect($path)->toMatch('#^/storage/covers/[a-f0-9\-]+\.jpg$#');

    $relative = str_replace('/storage/', '', $path);
    Storage::disk('public')->assertExists($relative);
});

test('delete removes existing file from public disk', function () {
    Storage::disk('public')->put('covers/to-delete.jpg', 'data');

    $this->service->delete('/storage/covers/to-delete.jpg');

    Storage::disk('public')->assertMissing('covers/to-delete.jpg');
});

test('delete ignores null empty and non storage paths', function () {
    Storage::disk('public')->put('covers/keep.jpg', 'data');

    $this->service->delete(null);
    $this->service->delete('');
    $this->service->delete('https://cdn.example.com/image.jpg');
    $this->service->delete('/uploads/covers/outside.jpg');

    Storage::disk('public')->assertExists('covers/keep.jpg');
});

test('delete is noop when file does not exist', function () {
    $this->service->delete('/storage/covers/missing.jpg');

    expect(Storage::disk('public')->exists('covers/missing.jpg'))->toBeFalse();
});
