<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('remediations', function (Blueprint $table) {
            $table->foreignUuid('user_id')->nullable()->after('id')->constrained('users')->nullOnDelete();
        });

        $adminId = DB::table('users')
            ->where('email', config('attacks.catalog_admin_email'))
            ->value('id');

        if ($adminId !== null) {
            DB::table('remediations')->whereNull('user_id')->update(['user_id' => $adminId]);
        }
    }

    public function down(): void
    {
        Schema::table('remediations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('user_id');
        });
    }
};
