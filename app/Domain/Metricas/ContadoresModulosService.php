<?php

namespace App\Domain\Metricas;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Contadores de pendientes por módulo para los badges de navegación.
 *
 * Se calculan en una sola consulta para minimizar round trips contra la base.
 */
final class ContadoresModulosService
{
    /**
     * @return array<string, int>
     */
    public function contadores(): array
    {
        $calcular = function (): array {
            $ahora = CarbonImmutable::now();

            try {
                $fila = DB::selectOne(<<<'SQL'
                    select
                        (select count(*) from stock_almacen
                            where (cantidad - cantidad_reservada) < stock_minimo) as stock_critico,
                        (select count(*) from solicitudes
                            where tipo = 'compra' and urgente
                              and estado in ('borrador', 'solicitado', 'aprobado')) as urgentes,
                        (select count(*) from transferencias
                            where estado in ('sugerida', 'solicitada')) as transferencias,
                        (select count(*) from excedentes_detectados
                            where estado in ('detectado', 'sugerido')) as excedentes,
                        (select count(*) from riesgos
                            where estado = 'abierto') as riesgos,
                        (select count(*) from hitos
                            where fecha_planificada < ? and estado <> 'completado') as hitos,
                        (select count(*) from inventarios_fisicos
                            where estado <> 'cerrado') as inventarios,
                        (select count(*) from ordenes_compra
                            where estado in ('emitida', 'confirmada_proveedor', 'en_transporte')) as ordenes,
                        (select count(*) from incidentes
                            where estado <> 'cerrado') as incidentes,
                        (select count(*) from capacitaciones
                            where estado = 'programada' and fecha_programada between ? and ?) as capacitaciones,
                        (select count(*) from observaciones_tecnicas
                            where estado in ('notificada', 'levantada')) as observaciones,
                        (select count(*) from residuos
                            where estado = 'registrado') as residuos,
                        (select count(*) from solicitudes_acceso
                            where estado = 'pendiente') as accesos
                SQL, [
                    $ahora->toDateString(),
                    $ahora->startOfDay()->toDateTimeString(),
                    $ahora->addDays(30)->endOfDay()->toDateTimeString(),
                ]);
            } catch (\Throwable) {
                return $this->vacios();
            }

            if ($fila === null) {
                return $this->vacios();
            }

            $stockCritico = (int) $fila->stock_critico;
            $urgentes = (int) $fila->urgentes;
            $transferencias = (int) $fila->transferencias;

            return [
                'panel-general' => $stockCritico + $urgentes + $transferencias,
                'programa-redistribucion' => (int) $fila->excedentes,
                'ciclo-vida' => (int) $fila->riesgos + (int) $fila->hitos,
                'matriz-stock' => $stockCritico + (int) $fila->inventarios,
                'requerimientos' => $urgentes + (int) $fila->ordenes,
                'asistencia-geocerca' => (int) $fila->incidentes + (int) $fila->capacitaciones,
                'observaciones-tecnicas' => (int) $fila->observaciones + (int) $fila->residuos,
                'solicitudes-acceso' => (int) $fila->accesos,
            ];
        };

        if (app()->runningUnitTests()) {
            return $calcular();
        }

        return Cache::remember('contadores_modulos', 60, $calcular);
    }

    /**
     * @return array<string, int>
     */
    private function vacios(): array
    {
        return [
            'panel-general' => 0,
            'programa-redistribucion' => 0,
            'ciclo-vida' => 0,
            'matriz-stock' => 0,
            'requerimientos' => 0,
            'asistencia-geocerca' => 0,
            'observaciones-tecnicas' => 0,
            'solicitudes-acceso' => 0,
        ];
    }
}
