<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categorias_material', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 100)->unique();
            $table->timestampsTz();
        });

        Schema::create('unidades_medida', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 10)->unique();
            $table->string('nombre', 60);
        });

        Schema::create('materiales', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 40)->unique();
            $table->string('nombre', 200);
            $table->foreignId('categoria_id')->constrained('categorias_material');
            $table->foreignId('unidad_id')->constrained('unidades_medida');
            $table->string('criticidad', 10)->default('normal');
            $table->boolean('es_epp')->default(false);
            $table->boolean('requiere_serie')->default(false);
            $table->boolean('requiere_lote')->default(false);
            $table->decimal('costo_referencial', 14, 4)->default(0);
            $table->jsonb('especificaciones')->default('{}');
            $table->boolean('activo')->default(true);
            $table->timestampsTz();
            $table->softDeletesTz();

            $table->index('categoria_id', 'idx_materiales_categoria');
        });

        Schema::create('stock_almacen', function (Blueprint $table) {
            $table->id();
            $table->foreignId('almacen_id')->constrained('almacenes');
            $table->foreignId('material_id')->constrained('materiales');
            $table->foreignId('ubicacion_id')->nullable()->constrained('ubicaciones_almacen');
            $table->decimal('cantidad', 14, 3)->default(0);
            $table->decimal('cantidad_reservada', 14, 3)->default(0);
            $table->decimal('stock_minimo', 14, 3)->default(0);
            $table->decimal('stock_seguridad', 14, 3)->default(0);
            $table->decimal('punto_reorden', 14, 3)->default(0);
            $table->decimal('stock_maximo', 14, 3)->nullable();
            $table->timestampsTz();

            $table->unique(['almacen_id', 'material_id']);
            $table->index('material_id', 'idx_stock_material');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE stock_almacen ADD CONSTRAINT chk_stock_cantidad CHECK (cantidad >= 0)');
            DB::statement('ALTER TABLE stock_almacen ADD CONSTRAINT chk_stock_reservada CHECK (cantidad_reservada >= 0 AND cantidad_reservada <= cantidad)');
        }

        Schema::create('kardex', function (Blueprint $table) {
            $table->id();
            $table->foreignId('almacen_id')->constrained('almacenes');
            $table->foreignId('material_id')->constrained('materiales');
            $table->unsignedBigInteger('lote_id')->nullable();
            $table->string('tipo_movimiento', 30);
            $table->decimal('cantidad', 14, 3);
            $table->decimal('saldo_resultante', 14, 3);
            $table->decimal('costo_unitario', 14, 4)->nullable();
            $table->string('documento_tipo', 40)->nullable();
            $table->unsignedBigInteger('documento_id')->nullable();
            $table->foreignId('usuario_id')->nullable()->constrained('usuarios');
            $table->text('observacion')->nullable();
            $table->timestampTz('created_at')->useCurrent();

            $table->index(['almacen_id', 'material_id', 'created_at'], 'idx_kardex_alm_mat');
            $table->index(['documento_tipo', 'documento_id'], 'idx_kardex_doc');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::unprepared("
                CREATE OR REPLACE FUNCTION fn_kardex_inmutable() RETURNS trigger AS \$\$
                BEGIN
                    RAISE EXCEPTION 'El kardex es inmutable: registre un movimiento de ajuste';
                END;
                \$\$ LANGUAGE plpgsql;

                CREATE TRIGGER trg_kardex_inmutable BEFORE UPDATE OR DELETE ON kardex
                FOR EACH ROW EXECUTE FUNCTION fn_kardex_inmutable();
            ");
        }

        Schema::create('partidas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('obra_id')->constrained('obras')->cascadeOnDelete();
            $table->foreignId('frente_id')->nullable()->constrained('frentes_trabajo');
            $table->string('codigo', 30);
            $table->string('descripcion', 240);
            $table->string('unidad', 15);
            $table->decimal('metrado', 14, 3)->default(0);
            $table->decimal('costo_unitario', 14, 4)->default(0);
            $table->decimal('avance_pct', 5, 2)->default(0);
            $table->date('fecha_inicio_prevista')->nullable();
            $table->date('fecha_fin_prevista')->nullable();
            $table->timestampsTz();

            $table->unique(['obra_id', 'codigo']);
        });

        Schema::create('partida_materiales', function (Blueprint $table) {
            $table->foreignId('partida_id')->constrained('partidas')->cascadeOnDelete();
            $table->foreignId('material_id')->constrained('materiales');
            $table->decimal('cantidad_por_unidad', 14, 5);
            $table->primary(['partida_id', 'material_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('partida_materiales');
        Schema::dropIfExists('partidas');
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP TRIGGER IF EXISTS trg_kardex_inmutable ON kardex');
            DB::statement('DROP FUNCTION IF EXISTS fn_kardex_inmutable');
        }
        Schema::dropIfExists('kardex');
        Schema::dropIfExists('stock_almacen');
        Schema::dropIfExists('materiales');
        Schema::dropIfExists('unidades_medida');
        Schema::dropIfExists('categorias_material');
    }
};
