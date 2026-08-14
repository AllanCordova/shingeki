<?php

namespace App\Providers;

use App\Models\Catalog\Attack;
use App\Models\Catalog\CatalogImport;
use App\Models\Catalog\Remediation;
use App\Models\Identity\User;
use App\Models\Scanning\AttackDispatch;
use App\Models\Scanning\SystemResult;
use App\Models\TargetAccess\Signature;
use App\Models\Workspace\Project;
use App\Models\Workspace\System;
use App\Policies\Catalog\CatalogPolicy;
use App\Policies\Scanning\AttackPolicy;
use App\Policies\Scanning\SystemResultPolicy;
use App\Policies\TargetAccess\SignaturePolicy;
use App\Policies\Workspace\ProjectPolicy;
use App\Policies\Workspace\SystemPolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use RuntimeException;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        JsonResource::withoutWrapping();

        Factory::guessFactoryNamesUsing(
            fn (string $modelName): string => 'Database\\Factories\\'.class_basename($modelName).'Factory',
        );

        Relation::morphMap([
            'attack_dispatch' => AttackDispatch::class,
            'catalog_import' => CatalogImport::class,
        ]);

        Gate::policy(Attack::class, AttackPolicy::class);
        Gate::policy(AttackDispatch::class, SystemResultPolicy::class);
        Gate::policy(Project::class, ProjectPolicy::class);
        Gate::policy(Signature::class, SignaturePolicy::class);
        Gate::policy(System::class, SystemPolicy::class);
        Gate::policy(SystemResult::class, SystemResultPolicy::class);

        $catalog = new CatalogPolicy;

        Gate::define('bulkImportCatalog', fn (User $user): bool => $catalog->bulkImport($user));
        Gate::define('manageCatalog', fn (User $user): bool => $catalog->manage($user));
        Gate::define('updateCatalogAttack', fn (User $user, Attack $attack): bool => $catalog->updateAttack($user, $attack));
        Gate::define('deleteCatalogAttack', fn (User $user, Attack $attack): bool => $catalog->deleteAttack($user, $attack));
        Gate::define('updateCatalogRemediation', fn (User $user, Remediation $remediation): bool => $catalog->updateRemediation($user, $remediation));
        Gate::define('deleteCatalogRemediation', fn (User $user, Remediation $remediation): bool => $catalog->deleteRemediation($user, $remediation));

        RateLimiter::for('auth', function (Request $request) {
            if ($this->app->environment('testing')) {
                return Limit::none();
            }

            $email = Str::lower((string) $request->input('email'));

            return [
                Limit::perMinute(5)->by($request->ip()),
                Limit::perMinute(5)->by($email !== '' ? $email : $request->ip()),
            ];
        });

        RateLimiter::for('target-session-capture', function (Request $request) {
            if ($this->app->environment('testing')) {
                return Limit::none();
            }

            return Limit::perMinute(10)->by($request->ip());
        });

        RateLimiter::for('signature-verify', function (Request $request) {
            if ($this->app->environment('testing')) {
                return Limit::none();
            }

            return Limit::perMinute(20)->by((string) ($request->user()?->id ?? $request->ip()));
        });

        $this->assertQueueCredentials();
    }

    private function assertQueueCredentials(): void
    {
        if (! $this->app->environment('production')) {
            return;
        }

        $user = config('queue.connections.rabbitmq.hosts.0.user');
        $ssl = (bool) config('queue.connections.rabbitmq.secure');

        if ($user === 'guest' || blank($user)) {
            throw new RuntimeException('RabbitMQ guest credentials are not allowed in production.');
        }

        if (! $ssl) {
            throw new RuntimeException('RabbitMQ TLS is required in production.');
        }
    }
}
