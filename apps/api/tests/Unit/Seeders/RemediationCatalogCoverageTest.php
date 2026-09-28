<?php

use App\Enums\Attack\AttackCategory;
use Database\Seeders\RemediationCatalogSeeder;
use Database\Seeders\StackCatalogSeeder;

test('every stack has a remediation and the generic catalog covers every finding category', function () {
    $definitions = RemediationCatalogSeeder::definitions();
    $covered = [];

    foreach ($definitions as $definition) {
        $covered[$definition['stack_slug']] = true;
    }

    foreach (StackCatalogSeeder::STACKS as $stack) {
        expect($covered)->toHaveKey($stack['slug']);
    }

    $genericCategories = collect($definitions)
        ->where('stack_slug', 'generic')
        ->map(fn (array $definition) => $definition['attack_category']->value)
        ->values()
        ->all();

    $expected = array_map(
        fn (AttackCategory $category) => $category->value,
        AttackCategory::cases(),
    );

    expect($genericCategories)->toEqualCanonicalizing($expected);
});