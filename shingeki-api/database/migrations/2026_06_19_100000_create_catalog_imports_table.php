<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('catalog_imports', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('type');
            $table->string('status');
            $table->unsignedSmallInteger('total_rows');
            $table->unsignedSmallInteger('processed_rows')->default(0);
            $table->unsignedSmallInteger('success_count')->default(0);
            $table->unsignedSmallInteger('failed_count')->default(0);
            $table->json('row_errors')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'type', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('catalog_imports');
    }
};
