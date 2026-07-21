<?php

namespace App\Providers;

use App\Models\Attack\Attack;
use App\Models\Attack\AttackDispatch;
use App\Models\Remediation\Remediation;
use App\Models\User\User;
use App\Policies\Catalog\CatalogPolicy;
use App\Policies\System\SystemResultPolicy;
use App\Socialite\GoogleOidcProvider;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Laravel\Socialite\Contracts\Factory as SocialiteFactory;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Factory::guessFactoryNamesUsing(
            fn (string $modelName): string => 'Database\\Factories\\'.class_basename($modelName).'Factory'
        );

        $this->app->make(SocialiteFactory::class)->extend('google', function ($app) {
            $config = $app['config']['services.google'];

            return $app->make(SocialiteFactory::class)->buildProvider(
                GoogleOidcProvider::class,
                $config,
            );
        });

        Gate::policy(AttackDispatch::class, SystemResultPolicy::class);

        $catalog = new CatalogPolicy;

        Gate::define('bulkImportCatalog', fn (User $user): bool => $catalog->bulkImport($user));
        Gate::define('manageCatalog', fn (User $user): bool => $catalog->manage($user));
        Gate::define('updateCatalogAttack', fn (User $user, Attack $attack): bool => $catalog->updateAttack($user, $attack));
        Gate::define('deleteCatalogAttack', fn (User $user, Attack $attack): bool => $catalog->deleteAttack($user, $attack));
        Gate::define('updateCatalogRemediation', fn (User $user, Remediation $remediation): bool => $catalog->updateRemediation($user, $remediation));
        Gate::define('deleteCatalogRemediation', fn (User $user, Remediation $remediation): bool => $catalog->deleteRemediation($user, $remediation));
    }
}
