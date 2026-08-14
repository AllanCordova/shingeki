<?php

use App\Services\Remediation\GitHub\GitHubApiClient;
use Illuminate\Support\Facades\Http;

describe('GitHubApiClient ensureBranchAt', function () {
    test('creates branch when patch fails with reference does not exist', function () {
        config([
            'github.token' => 'ghp_test_token',
            'github.api_base_url' => 'https://api.github.com',
        ]);

        Http::fake([
            'api.github.com/repos/acme/demo/git/refs/heads/fix-security-*' => Http::response([
                'message' => 'Reference does not exist',
            ], 422),
            'api.github.com/repos/acme/demo/git/refs' => Http::response([], 201),
        ]);

        $client = app(GitHubApiClient::class);

        $client->ensureBranchAt('acme', 'demo', 'fix-security-dispatch', 'sha123');

        Http::assertSent(function ($request) {
            return $request->method() === 'POST'
                && str_contains($request->url(), '/repos/acme/demo/git/refs')
                && $request->data()['ref'] === 'refs/heads/fix-security-dispatch'
                && $request->data()['sha'] === 'sha123';
        });
    });

    test('updates branch when ref already exists', function () {
        config([
            'github.token' => 'ghp_test_token',
            'github.api_base_url' => 'https://api.github.com',
        ]);

        Http::fake([
            'api.github.com/repos/acme/demo/git/refs/heads/fix-security-*' => Http::response([], 200),
        ]);

        $client = app(GitHubApiClient::class);

        $client->ensureBranchAt('acme', 'demo', 'fix-security-dispatch', 'sha456');

        Http::assertSent(function ($request) {
            return $request->method() === 'PATCH'
                && str_contains($request->url(), '/git/refs/heads/fix-security-dispatch')
                && $request->data()['sha'] === 'sha456'
                && $request->data()['force'] === true;
        });
    });
});
