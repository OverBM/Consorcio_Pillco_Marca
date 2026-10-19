<?php

namespace App\Domain\Personal;

use App\Models\Asistencia;
use App\Models\Marcacion;
use Illuminate\Support\Carbon;

/**
 * Consolida las marcaciones GPS del día en el registro diario de asistencia.
 */
class ConsolidarAsistenciaService
{
    /**
     * Recalcula la asistencia diaria del trabajador a partir de sus marcaciones.
     */
    public function consolidar(Marcacion $marcacion): Asistencia
    {
        $fecha = Carbon::parse($marcacion->marcado_en)->toDateString();

        $marcaciones = Marcacion::query()
            ->where('trabajador_id', $marcacion->trabajador_id)
            ->whereDate('marcado_en', $fecha)
            ->orderBy('marcado_en')
            ->get();

        $entrada = $marcaciones->firstWhere('tipo', 'entrada');
        $salida = $marcaciones->where('tipo', 'salida')->last();

        $horas = 0.0;
        if ($entrada && $salida) {
            $horas = round(
                Carbon::parse($entrada->marcado_en)->diffInMinutes(Carbon::parse($salida->marcado_en)) / 60,
                2
            );
        }

        $fueraGeocerca = $marcaciones->contains(fn (Marcacion $m) => ! $m->dentro_geocerca);

        $inconsistencia = match (true) {
            $fueraGeocerca => 'fuera_geocerca',
            $entrada && ! $salida => 'marcacion_faltante',
            default => null,
        };

        $asistencia = Asistencia::query()
            ->where('trabajador_id', $marcacion->trabajador_id)
            ->whereDate('fecha', $fecha)
            ->firstOrNew(['trabajador_id' => $marcacion->trabajador_id]);

        $asistencia->fill([
            'fecha' => $fecha,
            'obra_id' => $marcacion->obra_id,
            'horas_trabajadas' => $horas,
            'inconsistencia' => $inconsistencia,
            'estado' => $inconsistencia ? 'observada' : 'consolidada',
        ]);
        $asistencia->save();

        return $asistencia;
    }
}
