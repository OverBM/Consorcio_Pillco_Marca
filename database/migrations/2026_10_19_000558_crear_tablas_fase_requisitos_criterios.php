<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fase_requisitos', function (Blueprint $table) {
            $table->id();
            $table->string('fase', 24);
            $table->string('codigo', 60);
            $table->string('nombre', 160);
            $table->text('descripcion')->nullable();
            $table->smallInteger('orden')->default(0);
            $table->boolean('activo')->default(true);
            $table->timestampsTz();

            $table->unique(['fase', 'codigo']);
            $table->index('fase');
        });

        Schema::create('fase_criterios', function (Blueprint $table) {
            $table->id();
            $table->string('fase', 24);
            $table->string('codigo', 60);
            $table->string('nombre', 160);
            $table->string('tipo', 40);
            $table->json('parametros')->nullable();
            $table->decimal('umbral', 14, 3)->nullable();
            $table->boolean('obligatorio')->default(true);
            $table->smallInteger('orden')->default(0);
            $table->boolean('activo')->default(true);
            $table->timestampsTz();

            $table->unique(['fase', 'codigo']);
            $table->index('fase');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fase_criterios');
        Schema::dropIfExists('fase_requisitos');
    }
};
