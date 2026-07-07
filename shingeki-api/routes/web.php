<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

Route::get('/', function () {
    return view('welcome');
});

if (app()->environment('local')) {
    Route::get('/storage/{path}', function (string $path) {
        $relative = str_replace(['..', '\\'], ['', '/'], $path);

        if ($relative === '' || ! Storage::disk('public')->exists($relative)) {
            abort(404);
        }

        return response()->file(Storage::disk('public')->path($relative));
    })->where('path', '.*');
}
