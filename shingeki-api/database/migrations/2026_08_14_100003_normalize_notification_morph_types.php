<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        foreach ([
            'App\\Models\\AttackDispatch' => 'attack_dispatch',
            'App\\Models\\Scanning\\AttackDispatch' => 'attack_dispatch',
            'App\\Models\\CatalogImport' => 'catalog_import',
            'App\\Models\\Catalog\\CatalogImport' => 'catalog_import',
        ] as $legacy => $alias) {
            DB::table('user_notifications')
                ->where('subject_type', $legacy)
                ->update(['subject_type' => $alias]);
        }
    }

    public function down(): void
    {
        DB::table('user_notifications')
            ->where('subject_type', 'attack_dispatch')
            ->update(['subject_type' => 'App\\Models\\AttackDispatch']);

        DB::table('user_notifications')
            ->where('subject_type', 'catalog_import')
            ->update(['subject_type' => 'App\\Models\\CatalogImport']);
    }
};
