<?php

use App\Models\Stack;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

test('lists available stacks for authenticated users', function () {
    Stack::factory()->laravel()->create();
    Stack::factory()->create(['slug' => 'react', 'name' => 'React', 'languages' => ['javascript']]);

    Sanctum::actingAs(User::factory()->create());

    $this->getJson('/api/stacks')
        ->assertOk()
        ->assertJsonCount(2, 'stacks')
        ->assertJsonStructure([
            'stacks' => [['id', 'slug', 'name', 'languages']],
        ]);
});

test('requires authentication to list stacks', function () {
    $this->getJson('/api/stacks')->assertUnauthorized();
});
