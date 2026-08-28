<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')->where('role', 'user')->update(['role' => 'USER']);
        DB::table('users')->where('role', 'admin')->update(['role' => 'ADMIN']);
    }

    public function down(): void
    {
        DB::table('users')->where('role', 'USER')->update(['role' => 'user']);
        DB::table('users')->where('role', 'ADMIN')->update(['role' => 'admin']);
        DB::table('users')->where('role', 'SPECIALIST')->update(['role' => 'user']);
    }
};
