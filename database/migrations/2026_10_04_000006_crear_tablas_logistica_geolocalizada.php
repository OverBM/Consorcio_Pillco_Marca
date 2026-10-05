<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('solicitudes_material', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 30)->unique();
            $table->foreignId('obra_id')->constrained('obras');
            $table->foreignId('almacen_id')->constrained('almacenes');
            $table->foreignId('solicitante_id')->constrained('usuarios');
            $table->foreignId('frente_id')->nullable()->constrained('frentes_trabajo');
            $table->foreignId('partida_id')->nullable()->constrained('partidas');
            $table->boolean('urgente')->default(false);
            $table->string('estado', 20)->default('registrada');
            $table->timestampTz('atendida_en')->nullable();
            $table->timestampsTz();

            $table->index(['estado', 'urgente'], 'idx_sol_estado');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE solicitudes_material ADD COLUMN ubicacion_solicitud geography(Point,4326)');
        } else {
            Schema::table('solicitudes_material', function (Blueprint $table) {
                $table->text('ubicacion_solicitud')->nullable();
            });
        }

        Schema::create('solicitud_material_detalles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('solicitud_id')->constrained('solicitudes_material')->cascadeOnDelete();
            $table->foreignId('material_id')->constrained('materiales');
            $table->decimal('cantidad', 14, 3);
            $table->decimal('cantidad_atendida', 14, 3)->default(0);
        });

        Schema::create('busquedas_multialmacen', function (Blueprint $table) {
            $table->id();
            $table->foreignId('solicitud_id')->nullable()->constrained('solicitudes_material');
            $table->foreignId('material_id')->constrained('materiales');
            $table->foreignId('almacen_solicitante_id')->constrained('almacenes');
            $table->decimal('cantidad_requerida', 14, 3);
            $table->integer('radio_m');
            $table->jsonb('pesos');
            $table->foreignId('ejecutada_por')->nullable()->constrained('usuarios');
            $table->timestampTz('created_at')->useCurrent();
        });

        Schema::create('busqueda_resultados', function (Blueprint $table) {
            $table->id();
            $table->foreignId('busqueda_id')->constrained('busquedas_multialmacen')->cascadeOnDelete();
            $table->foreignId('almacen_candidato_id')->constrained('almacenes');
            $table->decimal('cantidad_disponible', 14, 3);
            $table->decimal('distancia_m', 12, 1);
            $table->decimal('eta_min', 8, 1)->nullable();
            $table->decimal('puntaje', 8, 4);
            $table->smallInteger('posicion');
            $table->boolean('elegido')->default(false);
        });

        Schema::create('excedentes_detectados', function (Blueprint $table) {
            $table->id();
            $table->foreignId('obra_origen_id')->constrained('obras');
            $table->foreignId('almacen_id')->constrained('almacenes');
            $table->foreignId('material_id')->constrained('materiales');
            $table->decimal('cantidad', 14, 3);
            $table->string('origen', 20)->default('cierre_obra');
            $table->string('estado', 15)->default('detectado');
            $table->timestampTz('detectado_en')->useCurrent();
            $table->timestampsTz();
        });

        Schema::create('transferencias', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 30)->unique();
            $table->foreignId('almacen_origen_id')->constrained('almacenes');
            $table->foreignId('almacen_destino_id')->constrained('almacenes');
            $table->foreignId('solicitud_id')->nullable()->constrained('solicitudes_material');
            $table->foreignId('excedente_id')->nullable()->constrained('excedentes_detectados');
            $table->string('motivo', 25);
            $table->string('estado', 25)->default('sugerida');
            $table->boolean('generada_automaticamente')->default(false);
            $table->decimal('distancia_m', 12, 1)->nullable();
            $table->decimal('eta_min', 8, 1)->nullable();
            $table->decimal('puntaje', 8, 4)->nullable();
            $table->foreignId('creada_por')->nullable()->constrained('usuarios');
            $table->foreignId('aprobada_por')->nullable()->constrained('usuarios');
            $table->timestampTz('aprobada_en')->nullable();
            $table->timestampsTz();

            $table->index('estado', 'idx_transf_estado');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE transferencias ADD CONSTRAINT chk_almacenes_distintos CHECK (almacen_origen_id <> almacen_destino_id)');
            DB::statement('ALTER TABLE transportes ADD CONSTRAINT fk_transporte_transf FOREIGN KEY (transferencia_id) REFERENCES transferencias(id)');
        }

        Schema::create('transferencia_detalles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transferencia_id')->constrained('transferencias')->cascadeOnDelete();
            $table->foreignId('material_id')->constrained('materiales');
            $table->foreignId('lote_id')->nullable()->constrained('lotes');
            $table->decimal('cantidad_solicitada', 14, 3);
            $table->decimal('cantidad_despachada', 14, 3)->nullable();
            $table->decimal('cantidad_recibida', 14, 3)->nullable();
        });

        Schema::create('despachos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transferencia_id')->unique()->constrained('transferencias');
            $table->foreignId('despachado_por')->constrained('usuarios');
            $table->timestampTz('despachado_en')->useCurrent();
            $table->text('observaciones')->nullable();
            $table->timestampsTz();
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE despachos ADD COLUMN ubicacion_despacho geography(Point,4326)');
        } else {
            Schema::table('despachos', function (Blueprint $table) {
                $table->text('ubicacion_despacho')->nullable();
            });
        }

        Schema::create('confirmaciones_recepcion_destino', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transferencia_id')->unique()->constrained('transferencias');
            $table->foreignId('almacenero_id')->constrained('usuarios');
            $table->timestampTz('recibida_en')->useCurrent();
            $table->string('firma_ruta', 255)->nullable();
            $table->string('foto_ruta', 255)->nullable();
            $table->boolean('hay_diferencias')->default(false);
            $table->text('observaciones')->nullable();
            $table->timestampsTz();
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE confirmaciones_recepcion_destino ADD COLUMN ubicacion_recepcion geography(Point,4326)');
        } else {
            Schema::table('confirmaciones_recepcion_destino', function (Blueprint $table) {
                $table->text('ubicacion_recepcion')->nullable();
            });
        }

        Schema::create('mermas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('almacen_id')->constrained('almacenes');
            $table->foreignId('material_id')->constrained('materiales');
            $table->foreignId('lote_id')->nullable()->constrained('lotes');
            $table->foreignId('transferencia_id')->nullable()->constrained('transferencias');
            $table->decimal('cantidad', 14, 3);
            $table->string('causa', 25);
            $table->text('justificacion');
            $table->string('estado', 12)->default('registrada');
            $table->foreignId('registrada_por')->constrained('usuarios');
            $table->foreignId('aprobada_por')->nullable()->constrained('usuarios');
            $table->timestampTz('aprobada_en')->nullable();
            $table->timestampsTz();
        });

        Schema::create('inventarios_fisicos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('almacen_id')->constrained('almacenes');
            $table->string('periodo', 20);
            $table->string('estado', 15)->default('programado');
            $table->boolean('ciego')->default(true);
            $table->decimal('tolerancia_pct', 5, 2)->default(0);
            $table->foreignId('programado_por')->constrained('usuarios');
            $table->foreignId('cerrado_por')->nullable()->constrained('usuarios');
            $table->timestampTz('cerrado_en')->nullable();
            $table->timestampsTz();
        });

        Schema::create('inventario_fisico_detalles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventario_id')->constrained('inventarios_fisicos')->cascadeOnDelete();
            $table->foreignId('material_id')->constrained('materiales');
            $table->decimal('cantidad_sistema', 14, 3);
            $table->decimal('cantidad_contada', 14, 3)->nullable();
            $table->decimal('cantidad_reconteo', 14, 3)->nullable();
            $table->text('justificacion')->nullable();
            $table->foreignId('justificacion_revisada_por')->nullable()->constrained('usuarios');
            $table->boolean('ajuste_aprobado')->nullable();
            $table->foreignId('ajuste_aprobado_por')->nullable()->constrained('usuarios');

            $table->unique(['inventario_id', 'material_id']);
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE inventario_fisico_detalles ADD COLUMN diferencia numeric(14,3) GENERATED ALWAYS AS (COALESCE(cantidad_reconteo, cantidad_contada) - cantidad_sistema) STORED');
        } else {
            Schema::table('inventario_fisico_detalles', function (Blueprint $table) {
                $table->decimal('diferencia', 14, 3)->nullable();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('inventario_fisico_detalles');
        Schema::dropIfExists('inventarios_fisicos');
        Schema::dropIfExists('mermas');
        Schema::dropIfExists('confirmaciones_recepcion_destino');
        Schema::dropIfExists('despachos');
        Schema::dropIfExists('transferencia_detalles');
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE transportes DROP CONSTRAINT IF EXISTS fk_transporte_transf');
        }
        Schema::dropIfExists('transferencias');
        Schema::dropIfExists('excedentes_detectados');
        Schema::dropIfExists('busqueda_resultados');
        Schema::dropIfExists('busquedas_multialmacen');
        Schema::dropIfExists('solicitud_material_detalles');
        Schema::dropIfExists('solicitudes_material');
    }
};
