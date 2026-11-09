<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('systems', function (Blueprint $table) {
            $columns = array_values(array_filter(
                [
                    'login_mode',
                    'register_url',
                    'register_body',
                    'login_body',
                    'login_username',
                    'login_password',
                    'logged_in_indicator',
                ],
                fn (string $column): bool => Schema::hasColumn('systems', $column),
            ));

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }

    public function down(): void
    {
        Schema::table('systems', function (Blueprint $table) {
            if (! Schema::hasColumn('systems', 'login_username')) {
                $table->text('login_username')->nullable();
                $table->text('login_password')->nullable();
                $table->string('logged_in_indicator')->nullable();
            }

            if (! Schema::hasColumn('systems', 'login_mode')) {
                $table->string('login_mode')->default('credentials');
                $table->string('register_url', 2048)->nullable();
            }

            if (! Schema::hasColumn('systems', 'register_body')) {
                $table->json('register_body')->nullable();
                $table->json('login_body')->nullable();
            }
        });
    }
};
