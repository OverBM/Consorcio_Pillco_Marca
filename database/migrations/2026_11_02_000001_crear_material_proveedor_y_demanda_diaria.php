<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('material_proveedor', function (Blueprint $table) {
            $table->id();
            $table->foreignId('material_id')->constrained('materiales')->cascadeOnDelete();
            $table->foreignId('proveedor_id')->constrained('proveedores')->cascadeOnDelete();
            $table->decimal('lead_time_dias', 8, 2);
            $table->decimal('costo_pedido', 14, 4)->default(0);
            $table->decimal('precio_unitario', 14, 4)->default(0);
            $table->boolean('es_principal')->default(false);
            $table->boolean('activo')->default(true);
            $table->timestampsTz();
            $table->softDeletesTz();

            $table->unique(['material_id', 'proveedor_id'], 'uq_material_proveedor');
            $table->index(['material_id', 'es_principal'], 'idx_material_proveedor_principal');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("
                CREATE OR REPLACE VIEW v_demanda_diaria AS
                WITH movimientos AS (
                    SELECT
                        almacen_id,
                        material_id,
                        DATE(created_at AT TIME ZONE 'America/Lima') AS fecha,
                        SUM(ABS(cantidad))::numeric(14,3) AS cantidad
                    FROM kardex
                    WHERE tipo_movimiento IN ('salida_consumo', 'salida_transferencia', 'salida_despacho', 'salida_epp')
                    GROUP BY almacen_id, material_id, DATE(created_at AT TIME ZONE 'America/Lima')
                ),
                rangos AS (
                    SELECT almacen_id, material_id, MIN(fecha) AS desde, MAX(fecha) AS hasta
                    FROM movimientos
                    GROUP BY almacen_id, material_id
                ),
                dias AS (
                    SELECT r.almacen_id, r.material_id, d::date AS fecha
                    FROM rangos r
                    CROSS JOIN LATERAL generate_series(r.desde, r.hasta, INTERVAL '1 day') AS d
                )
                SELECT d.almacen_id, d.material_id, d.fecha,
                       COALESCE(m.cantidad, 0)::numeric(14,3) AS cantidad
                FROM dias d
                LEFT JOIN movimientos m
                    ON m.almacen_id = d.almacen_id
                   AND m.material_id = d.material_id
                   AND m.fecha = d.fecha
            ");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP VIEW IF EXISTS v_demanda_diaria');
        }

        Schema::dropIfExists('material_proveedor');
    }
};
