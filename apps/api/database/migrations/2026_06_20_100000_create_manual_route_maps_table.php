<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('manual_route_maps', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('system_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('method', 16);
            $table->string('path');
            $table->json('query')->nullable();
            $table->json('headers')->nullable();
            $table->text('body')->nullable();
            $table->string('content_type')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['system_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('manual_route_maps');
    }
};
