<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tablas transaccionales/catálogo que aún no tenían created_at.
     * Las tablas append-only conservan solo created_at por diseño.
     *
     * @var list<string>
     */
    private array $tablas = [
        'cotizacion_detalles',
        'devolucion_detalles',
        'epp_asignaciones',
        'indicadores_ambientales',
        'inventario_fisico_detalles',
        'orden_compra_detalles',
        'permiso_rol',
        'planilla_detalles',
        'recepcion_detalles',
        'solicitud_detalles',
        'transferencia_detalles',
        'ubicaciones_almacen',
        'unidades_medida',
        'usuario_almacen',
        'usuario_obra',
        'usuario_rol',
    ];

    public function up(): void
    {
        foreach ($this->tablas as $tabla) {
            if (! Schema::hasTable($tabla) || Schema::hasColumn($tabla, 'created_at')) {
                continue;
            }

            Schema::table($tabla, function (Blueprint $table): void {
                $table->timestampTz('created_at')->nullable()->useCurrent();
            });
        }
    }

    public function down(): void
    {
        foreach ($this->tablas as $tabla) {
            if (! Schema::hasTable($tabla) || ! Schema::hasColumn($tabla, 'created_at')) {
                continue;
            }

            Schema::table($tabla, function (Blueprint $table): void {
                $table->dropColumn('created_at');
            });
        }
    }
};
