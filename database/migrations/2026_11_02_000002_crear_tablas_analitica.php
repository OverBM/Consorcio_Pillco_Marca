<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parametros_inventario', function (Blueprint $table) {
            $table->id();
            $table->foreignId('almacen_id')->constrained('almacenes')->cascadeOnDelete();
            $table->foreignId('material_id')->constrained('materiales')->cascadeOnDelete();
            $table->decimal('eoq', 14, 3)->nullable();
            $table->decimal('stock_seguridad', 14, 3)->nullable();
            $table->decimal('punto_reorden', 14, 3)->nullable();
            $table->decimal('costo_total_relevante', 14, 3)->nullable();
            $table->decimal('demanda_media_diaria', 14, 4)->default(0);
            $table->decimal('demanda_anual', 14, 4)->default(0);
            $table->decimal('lead_time_dias', 8, 2)->nullable();
            $table->decimal('nivel_servicio', 5, 4)->default(0.95);
            $table->string('clase_abc', 12)->default('C');
            $table->string('clase_xyz', 1)->default('X');
            $table->string('clase_combinada', 13)->default('CX');
            $table->decimal('coeficiente_variacion', 10, 6)->default(0);
            $table->string('estado', 30)->default('calculado');
            $table->string('modelo_version', 40);
            $table->string('origen', 15)->default('programado');
            $table->boolean('vigente')->default(true);
            $table->jsonb('payload')->nullable();
            $table->timestampTz('calculado_en');
            $table->timestampsTz();

            $table->index(['almacen_id', 'material_id', 'vigente'], 'idx_parametros_vigente');
            $table->index(['material_id', 'calculado_en'], 'idx_parametros_material_fecha');
        });

        Schema::create('pronosticos_demanda', function (Blueprint $table) {
            $table->id();
            $table->foreignId('almacen_id')->constrained('almacenes')->cascadeOnDelete();
            $table->foreignId('material_id')->constrained('materiales')->cascadeOnDelete();
            $table->date('fecha');
            $table->decimal('cantidad', 14, 3);
            $table->decimal('limite_inferior', 14, 3)->default(0);
            $table->decimal('limite_superior', 14, 3)->default(0);
            $table->decimal('mape', 8, 3)->nullable();
            $table->decimal('rmse', 14, 4)->default(0);
            $table->string('metodo_usado', 40);
            $table->boolean('baja_confianza')->default(false);
            $table->string('modelo_version', 40);
            $table->timestampTz('calculado_en');
            $table->timestampsTz();

            $table->unique(
                ['almacen_id', 'material_id', 'fecha', 'modelo_version'],
                'uq_pronostico_serie_fecha'
            );
        });

        Schema::create('alertas_abastecimiento', function (Blueprint $table) {
            $table->id();
            $table->foreignId('almacen_id')->constrained('almacenes')->cascadeOnDelete();
            $table->foreignId('material_id')->constrained('materiales')->cascadeOnDelete();
            $table->string('tipo', 40);
            $table->string('severidad', 15);
            $table->date('fecha_estimada')->nullable();
            $table->decimal('cantidad_sugerida', 14, 3)->nullable();
            $table->text('detalle');
            $table->string('clave_idempotente', 120)->unique();
            $table->string('estado', 15)->default('vigente');
            $table->foreignId('reconocida_por')->nullable()->constrained('usuarios');
            $table->timestampTz('reconocida_en')->nullable();
            $table->timestampsTz();

            $table->index(['estado', 'severidad'], 'idx_alertas_abast_estado');
            $table->index(['almacen_id', 'material_id'], 'idx_alertas_abast_par');
        });

        Schema::create('ejecuciones_analitica', function (Blueprint $table) {
            $table->id();
            $table->string('origen', 15)->default('manual');
            $table->string('estado', 20)->default('en_proceso');
            $table->timestampTz('inicio');
            $table->timestampTz('fin')->nullable();
            $table->unsignedInteger('duracion_ms')->nullable();
            $table->unsignedInteger('series')->default(0);
            $table->unsignedInteger('calculadas')->default(0);
            $table->unsignedInteger('alertas')->default(0);
            $table->unsignedInteger('errores')->default(0);
            $table->text('mensaje')->nullable();
            $table->timestampsTz();
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('
                CREATE UNIQUE INDEX uq_parametro_vigente
                ON parametros_inventario (almacen_id, material_id)
                WHERE vigente = true
            ');
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS uq_parametro_vigente');
        }

        Schema::dropIfExists('ejecuciones_analitica');
        Schema::dropIfExists('alertas_abastecimiento');
        Schema::dropIfExists('pronosticos_demanda');
        Schema::dropIfExists('parametros_inventario');
    }
};
