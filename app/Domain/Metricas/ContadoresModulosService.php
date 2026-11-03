<?php

namespace App\Domain\Metricas;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Contadores de pendientes por módulo para los badges de navegación.
 *
 * Cada contador se calcula de forma independiente: si una consulta falla,
 * el módulo simplemente queda sin badge en lugar de romper la página.
 */
final class ContadoresModulosService
{
    /**
     * @return array<string, int>
     */
    public function contadores(): array
    {
        $stockCritico = $this->seguro(fn (): int => (int) DB::table('stock_almacen')
            ->whereRaw('(cantidad - cantidad_reservada) < stock_minimo')
            ->count());

        $urgentes = $this->seguro(fn (): int => (int) DB::table('requerimientos')
            ->where('prioridad', 'urgente')
            ->whereNotIn('estado', ['atendido', 'rechazado', 'anulado'])
            ->count());

        $transferenciasPorAprobar = $this->seguro(fn (): int => (int) DB::table('transferencias')
            ->whereIn('estado', ['sugerida', 'solicitada'])
            ->count());

        return [
            'panel-general' => $stockCritico + $urgentes + $transferenciasPorAprobar,
            'programa-redistribucion' => $this->seguro(fn (): int => (int) DB::table('excedentes_detectados')
                ->whereIn('estado', ['detectado', 'sugerido'])
                ->count()),
            'ciclo-vida' => $this->seguro(fn (): int => (int) DB::table('riesgos')
                ->where('estado', 'abierto')
                ->count()) + $this->seguro(fn (): int => (int) DB::table('hitos')
                ->where('fecha_planificada', '<', CarbonImmutable::now()->toDateString())
                ->where('estado', '!=', 'completado')
                ->count()),
            'matriz-stock' => $stockCritico + $this->seguro(fn (): int => (int) DB::table('inventarios_fisicos')
                ->where('estado', '!=', 'cerrado')
                ->count()),
            'requerimientos' => $urgentes + $this->seguro(fn (): int => (int) DB::table('ordenes_compra')
                ->whereIn('estado', ['emitida', 'en_transito'])
                ->count()),
            'asistencia-geocerca' => $this->seguro(fn (): int => (int) DB::table('incidentes')
                ->where('estado', '!=', 'cerrado')
                ->count()) + $this->seguro(fn (): int => (int) DB::table('capacitaciones')
                ->where('estado', 'programada')
                ->whereBetween('fecha_programada', [
                    CarbonImmutable::now()->startOfDay(),
                    CarbonImmutable::now()->addDays(30)->endOfDay(),
                ])
                ->count()),
            'observaciones-tecnicas' => $this->seguro(fn (): int => (int) DB::table('observaciones_tecnicas')
                ->whereIn('estado', ['abierta', 'en_proceso'])
                ->count()) + $this->seguro(fn (): int => (int) DB::table('residuos')
                ->whereIn('estado', ['registrado', 'pendiente'])
                ->count()),
            'solicitudes-acceso' => $this->seguro(fn (): int => (int) DB::table('solicitudes_acceso')
                ->where('estado', 'pendiente')
                ->count()),
        ];
    }

    private function seguro(callable $consulta): int
    {
        try {
            return $consulta();
        } catch (\Throwable) {
            return 0;
        }
    }
}
