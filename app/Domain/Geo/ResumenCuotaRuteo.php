<?php

namespace App\Domain\Geo;

use App\Models\RuteoConsumo;
use Illuminate\Support\Carbon;

/**
 * Resumen de consumo del proveedor de ruteo para mostrar en la interfaz.
 */
class ResumenCuotaRuteo
{
    /**
     * @return array<string, mixed>
     */
    public function hoy(): array
    {
        $fecha = now()->toDateString();
        $limite = (int) config('ruteo.presupuesto_diario', 1500);
        $filas = RuteoConsumo::query()->whereDate('fecha', $fecha)->get();
        $usadas = (int) $filas->sum('llamadas');

        return [
            'fecha' => $fecha,
            'limite' => $limite,
            'usadas' => $usadas,
            'restantes' => max($limite - $usadas, 0),
            'porcentaje' => $limite > 0
                ? round(min($usadas / $limite * 100, 100), 1)
                : 0.0,
            'geocodificaciones' => (int) $filas->sum('geocodificaciones'),
            'fallos' => (int) $filas->sum('fallos'),
            'actualizado_en' => now()->toIso8601String(),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function ultimosDias(int $dias = 7): array
    {
        $desde = Carbon::today()->subDays($dias - 1);

        return RuteoConsumo::query()
            ->where('fecha', '>=', $desde->toDateString())
            ->orderBy('fecha')
            ->get()
            ->groupBy(fn (RuteoConsumo $consumo): string => $consumo->fecha->toDateString())
            ->map(fn ($filas, string $fecha): array => [
                'fecha' => $fecha,
                'llamadas' => (int) $filas->sum('llamadas'),
                'exitos' => (int) $filas->sum('exitos'),
                'fallos' => (int) $filas->sum('fallos'),
                'geocodificaciones' => (int) $filas->sum('geocodificaciones'),
            ])
            ->values()
            ->all();
    }
}
