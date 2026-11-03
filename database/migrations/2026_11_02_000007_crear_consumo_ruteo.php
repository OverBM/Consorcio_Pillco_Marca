<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ruteo_consumos', function (Blueprint $table) {
            $table->id();
            $table->date('fecha');
            $table->string('driver', 20);
            $table->unsignedInteger('llamadas')->default(0);
            $table->unsignedInteger('exitos')->default(0);
            $table->unsignedInteger('fallos')->default(0);
            $table->unsignedInteger('geocodificaciones')->default(0);
            $table->timestampsTz();

            $table->unique(['fecha', 'driver'], 'uq_ruteo_consumo_dia');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ruteo_consumos');
    }
};
