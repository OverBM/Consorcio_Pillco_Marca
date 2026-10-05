<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notificaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuarios')->cascadeOnDelete();
            $table->string('tipo', 40);
            $table->string('titulo', 160);
            $table->text('cuerpo')->nullable();
            $table->string('referencia_tipo', 40)->nullable();
            $table->unsignedBigInteger('referencia_id')->nullable();
            $table->timestampTz('leida_en')->nullable();
            $table->timestampsTz();

            $table->index(['usuario_id', 'leida_en'], 'idx_notif_usuario');
        });

        if (DB::getDriverName() === 'pgsql') {
            // 1. fn_buscar_almacenes_con_stock
            DB::unprepared('
                CREATE OR REPLACE FUNCTION fn_buscar_almacenes_con_stock(
                    p_material_id bigint, p_cantidad numeric, p_almacen_solicitante bigint, p_radio_m integer DEFAULT 50000
                )
                RETURNS TABLE (almacen_id bigint, obra_id bigint, disponible numeric, distancia_m numeric) AS $$
                    SELECT a.id, a.obra_id,
                           (s.cantidad - s.cantidad_reservada) AS disponible,
                           ST_Distance(a.ubicacion, sol.ubicacion)::numeric(12,1) AS distancia_m
                    FROM almacenes a
                    JOIN almacenes sol ON sol.id = p_almacen_solicitante
                    JOIN stock_almacen s ON s.almacen_id = a.id AND s.material_id = p_material_id
                    WHERE a.activo AND a.id <> p_almacen_solicitante
                      AND (s.cantidad - s.cantidad_reservada) > 0
                      AND ST_DWithin(a.ubicacion, sol.ubicacion, p_radio_m)
                    ORDER BY ST_Distance(a.ubicacion, sol.ubicacion);
                $$ LANGUAGE sql STABLE;
            ');

            // 2. fn_obras_con_deficit
            DB::unprepared("
                CREATE OR REPLACE FUNCTION fn_obras_con_deficit(
                    p_material_id bigint, p_almacen_origen bigint, p_radio_m integer DEFAULT 50000
                )
                RETURNS TABLE (almacen_id bigint, obra_id bigint, deficit numeric, distancia_m numeric) AS \$\$
                    SELECT a.id, a.obra_id,
                           GREATEST(s.stock_minimo - s.cantidad, 0) AS deficit,
                           ST_Distance(a.ubicacion, org.ubicacion)::numeric(12,1)
                    FROM almacenes a
                    JOIN almacenes org ON org.id = p_almacen_origen
                    JOIN obras o ON o.id = a.obra_id AND o.estado = 'ejecucion'
                    JOIN stock_almacen s ON s.almacen_id = a.id AND s.material_id = p_material_id
                    WHERE a.activo AND a.id <> p_almacen_origen
                      AND s.cantidad < s.stock_minimo
                      AND ST_DWithin(a.ubicacion, org.ubicacion, p_radio_m)
                    ORDER BY ST_Distance(a.ubicacion, org.ubicacion);
                \$\$ LANGUAGE sql STABLE;
            ");

            // 3. fn_dentro_geocerca
            DB::unprepared('
                CREATE OR REPLACE FUNCTION fn_dentro_geocerca(p_obra_id bigint, p_punto geography)
                RETURNS TABLE (dentro boolean, distancia_m numeric) AS $$
                    SELECT bool_or(ST_DWithin(a.ubicacion, p_punto, a.radio_geocerca_m)),
                           MIN(ST_Distance(a.ubicacion, p_punto))::numeric(10,1)
                    FROM almacenes a WHERE a.obra_id = p_obra_id AND a.activo;
                $$ LANGUAGE sql STABLE;
            ');

            // 4. v_stock_critico
            DB::unprepared("
                CREATE OR REPLACE VIEW v_stock_critico AS
                SELECT s.almacen_id, a.nombre AS almacen, a.obra_id, s.material_id, m.nombre AS material, m.criticidad,
                       s.cantidad, s.cantidad_reservada, (s.cantidad - s.cantidad_reservada) AS disponible,
                       s.stock_minimo, s.punto_reorden,
                       CASE WHEN s.cantidad <= s.stock_minimo THEN 'bajo_minimo'
                            WHEN s.cantidad <= s.punto_reorden THEN 'en_reorden' END AS situacion
                FROM stock_almacen s
                JOIN almacenes a ON a.id = s.almacen_id
                JOIN materiales m ON m.id = s.material_id
                WHERE s.cantidad <= s.punto_reorden OR s.cantidad <= s.stock_minimo;
            ");

            // 5. v_evm_obra
            DB::unprepared('
                CREATE OR REPLACE VIEW v_evm_obra AS
                WITH acum AS (
                  SELECT v.obra_id, v.periodo,
                         SUM(v.valor_planificado) OVER w AS pv, SUM(v.valor_ganado) OVER w AS ev, SUM(v.costo_real) OVER w AS ac
                  FROM valorizaciones v WINDOW w AS (PARTITION BY v.obra_id ORDER BY v.periodo)
                )
                SELECT c.obra_id, c.periodo, c.pv, c.ev, c.ac,
                       CASE WHEN c.pv > 0 THEN round(c.ev / c.pv, 3) END AS spi,
                       CASE WHEN c.ac > 0 THEN round(c.ev / c.ac, 3) END AS cpi,
                       lb.bac,
                       CASE WHEN c.ac > 0 AND c.ev > 0 THEN round(lb.bac / (c.ev / c.ac), 2) END AS eac,
                       CASE WHEN c.ac > 0 AND c.ev > 0 THEN round(lb.bac - lb.bac / (c.ev / c.ac), 2) END AS vac
                FROM acum c LEFT JOIN lineas_base_costo lb ON lb.obra_id = c.obra_id AND lb.vigente;
            ');
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP VIEW IF EXISTS v_evm_obra');
            DB::statement('DROP VIEW IF EXISTS v_stock_critico');
            DB::statement('DROP FUNCTION IF EXISTS fn_dentro_geocerca');
            DB::statement('DROP FUNCTION IF EXISTS fn_obras_con_deficit');
            DB::statement('DROP FUNCTION IF EXISTS fn_buscar_almacenes_con_stock');
        }
        Schema::dropIfExists('notificaciones');
    }
};
