<?php

namespace App\Providers;

use App\Models\Attack;
use App\Models\AttackDispatch;
use App\Models\Remediation;
use App\Models\User;
use App\Policies\CatalogPolicy;
use App\Policies\SystemResultPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

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
