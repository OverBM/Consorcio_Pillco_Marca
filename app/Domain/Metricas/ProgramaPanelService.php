<?php

namespace App\Domain\Metricas;

use App\Domain\Project\EvmProjectService;
use App\Models\Hito;
use App\Models\Obra;
use Carbon\CarbonImmutable;

/**
 * Franja PMI/PMU del panel: avance ponderado del programa, SPI/CPI e hitos
 * próximos. Reutiliza el servicio EVM existente para no duplicar fórmulas.
 */
final class ProgramaPanelService
{
    public function __construct(private readonly EvmProjectService $evm) {}

    /**
     * @return array{
     *     obrasActivas: int,
     *     avancePonderado: float,
     *     spi: float,
     *     cpi: float,
     *     hitosProximos: int,
     *     hitos: list<array{id: int, nombre: string, obra: string, fecha: string}>
     * }
     */
    public function resumen(int $diasHitos = 7): array
    {
        $obras = Obra::query()
            ->whereIn('estado', ['ejecucion', 'activa', 'en_ejecucion'])
            ->get(['id', 'nombre', 'estado', 'avance_fisico_pct', 'presupuesto_base']);

        $presupuesto = (float) $obras->sum(fn (Obra $obra) => (float) ($obra->presupuesto_base ?? 0));
        $avancePonderado = $presupuesto > 0
            ? (float) $obras->sum(
                fn (Obra $obra) => ((float) ($obra->avance_fisico_pct ?? 0)) * ((float) ($obra->presupuesto_base ?? 0))
            ) / $presupuesto
            : 0.0;

        $consolidado = $this->evm->calcularConsolidadoPrograma();

        $hasta = CarbonImmutable::now()->addDays($diasHitos)->endOfDay();

        $hitos = Hito::query()
            ->with('obra:id,nombre')
            ->whereBetween('fecha_planificada', [
                CarbonImmutable::now()->startOfDay()->toDateString(),
                $hasta->toDateString(),
            ])
            ->where('estado', '!=', 'completado')
            ->orderBy('fecha_planificada')
            ->limit(5)
            ->get(['id', 'obra_id', 'nombre', 'fecha_planificada']);

        return [
            'obrasActivas' => $obras->count(),
            'avancePonderado' => round($avancePonderado, 1),
            'spi' => (float) ($consolidado['spi'] ?? 1.0),
            'cpi' => (float) ($consolidado['cpi'] ?? 1.0),
            'hitosProximos' => $hitos->count(),
            'hitos' => array_values($hitos->map(fn (Hito $hito): array => [
                'id' => (int) $hito->id,
                'nombre' => (string) $hito->nombre,
                'obra' => $hito->obra instanceof Obra ? (string) $hito->obra->nombre : '',
                'fecha' => (string) $hito->fecha_planificada,
            ])->all()),
        ];
    }
}
