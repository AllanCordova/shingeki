<?php

use App\Enums\Attack\AttackCategory;
use App\Support\DastRouteMap;
use Database\Seeders\DemoProjectsSeeder;
use Database\Seeders\ScannerTargetExpectations;
use Database\Seeders\ScannerTargetRoutes;

test('scanner target expectations stay inside the attack catalog and match the seeded systems', function () {
    $expectations = ScannerTargetExpectations::all();
    $names = array_column(DemoProjectsSeeder::TARGETS, 'name');
    $covers = array_column(DemoProjectsSeeder::TARGETS, 'cover');

    expect(array_keys($expectations))->toBe($names)
        ->and(array_unique($covers))->toHaveCount(count($names));

    foreach (DemoProjectsSeeder::TARGETS as $target) {
        expect(is_file(database_path('seeders/assets/covers/'.$target['cover'])))->toBeTrue();

        $entry = $expectations[$target['name']];

        expect($entry['in_catalog'])->not->toBeEmpty()
            ->and($entry['note'])->not->toBe('');

        foreach ([...$entry['in_catalog'], ...$entry['unreliable']] as $finding) {
            expect(AttackCategory::tryFrom($finding['category']))->not->toBeNull()
                ->and($finding['where'])->not->toBe('');
        }

        $routes = ScannerTargetRoutes::dispatchRoutes($target['name']);
        expect($routes)->not->toBeEmpty()
            ->and(count($routes))->toBeLessThanOrEqual(DastRouteMap::MAX_ROUTES);
        expect(fn () => DastRouteMap::normalize($routes))->not->toThrow(InvalidArgumentException::class);

        $covered = ScannerTargetRoutes::coveredCategories($target['name']);
        foreach ($entry['in_catalog'] as $finding) {
            if ($finding['category'] === AttackCategory::SupplyChain->value) {
                expect($target['repository_url'])->toContain('github.com');

                continue;
            }

            expect($covered)->toContain($finding['category']);
        }
    }
});
