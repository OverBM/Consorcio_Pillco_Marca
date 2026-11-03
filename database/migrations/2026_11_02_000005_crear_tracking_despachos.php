<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('despacho_posiciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('despacho_id')->constrained('despachos')->cascadeOnDelete();
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

            $table->index(['despacho_id', 'capturada_en'], 'idx_posiciones_despacho_fecha');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE despacho_posiciones ADD COLUMN ubicacion geography(Point,4326)');
            DB::statement('CREATE INDEX idx_posiciones_ubicacion ON despacho_posiciones USING GIST (ubicacion)');
        }

        Schema::create('alertas_geoespaciales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('despacho_id')->constrained('despachos')->cascadeOnDelete();
            $table->string('tipo', 40);
            $table->string('severidad', 15);
            $table->decimal('distancia_m', 12, 1)->nullable();
            $table->decimal('tiempo_min', 8, 1)->nullable();
            $table->text('detalle');
            $table->string('clave_idempotente', 120)->unique();
            $table->string('estado', 15)->default('vigente');
            $table->foreignId('reconocida_por')->nullable()->constrained('usuarios');
            $table->timestampTz('reconocida_en')->nullable();
            $table->timestampsTz();

            $table->index(['estado', 'severidad'], 'idx_alertas_geo_estado');
        });
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS idx_posiciones_ubicacion');
        }

        Schema::dropIfExists('alertas_geoespaciales');
        Schema::dropIfExists('despacho_posiciones');
    }
};
