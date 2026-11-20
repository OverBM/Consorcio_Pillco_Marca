<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transferencia_posiciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transferencia_id')->constrained('transferencias')->cascadeOnDelete();
            $table->decimal('latitud', 10, 7);
            $table->decimal('longitud', 10, 7);
            $table->decimal('precision_m', 8, 2)->nullable();
            $table->decimal('velocidad_kmh', 8, 2)->nullable();
            $table->decimal('rumbo', 6, 2)->nullable();
            $table->string('origen', 20)->default('pwa');
            $table->uuid('uuid')->unique();
            $table->timestampTz('capturada_en');
            $table->timestampTz('recibida_en');
            $table->timestampsTz();

            $table->index(['transferencia_id', 'capturada_en'], 'idx_posiciones_transferencia_fecha');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE transferencia_posiciones ADD COLUMN ubicacion geography(Point,4326)');
            DB::statement('CREATE INDEX idx_posiciones_ubicacion ON transferencia_posiciones USING GIST (ubicacion)');
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS idx_posiciones_ubicacion');
        }

        Schema::dropIfExists('transferencia_posiciones');
    }
};
