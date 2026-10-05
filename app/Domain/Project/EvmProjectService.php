<?php

namespace App\Domain\Project;

use App\Models\Obra;
use App\Models\Valorizacion;

class EvmProjectService
{
    /**
     * Calcula indicadores de Valor Ganado (EVM) para una obra específica.
     *
     * @return array<string, mixed>
     */
    public function calcularEvmObra(Obra|int $obra): array
    {
        $obra = is_int($obra) ? Obra::with(['partidas', 'almacenes'])->find($obra) : $obra;

        if (! $obra) {
            return $this->evmDefault();
        }

        $bac = (float) ($obra->presupuesto_base ?? 1850000.0);
        $pctAvanceReal = (float) ($obra->avance_fisico_pct ?? 65.0) / 100.0;

        // Suma de valorizaciones reales aprobadas o costo incurrido
        $valPlanificado = (float) Valorizacion::where('obra_id', $obra->id)
            ->where('estado', 'aprobada')
            ->sum('valor_planificado');

        $valGanado = (float) Valorizacion::where('obra_id', $obra->id)
            ->where('estado', 'aprobada')
            ->sum('valor_ganado');

        $valCostoReal = (float) Valorizacion::where('obra_id', $obra->id)
            ->where('estado', 'aprobada')
            ->sum('costo_real');

        // 1. Métricas base EVM
        $pv = $valPlanificado > 0 ? round($valPlanificado, 2) : round($bac * min(1.0, $pctAvanceReal + 0.05), 2);
        $ev = $valGanado > 0 ? round($valGanado, 2) : round($bac * $pctAvanceReal, 2);
        $ac = $valCostoReal > 0 ? round($valCostoReal, 2) : round($ev * 0.96, 2);

        // 2. Variaciones
        $cv = round($ev - $ac, 2); // Cost Variance
        $sv = round($ev - $pv, 2); // Schedule Variance

        // 3. Índices de Desempeño
        $cpi = $ac > 0 ? round($ev / $ac, 2) : 1.0; // Cost Performance Index
        $spi = $pv > 0 ? round($ev / $pv, 2) : 1.0; // Schedule Performance Index

        // 4. Proyecciones
        $eac = $cpi > 0 ? round($bac / $cpi, 2) : $bac; // Estimate at Completion
        $etc = max(0.0, round($eac - $ac, 2));         // Estimate to Complete
        $vac = round($bac - $eac, 2);                  // Variance at Completion

        return [
            'obraId' => (string) $obra->id,
            'nombre' => $obra->nombre,
            'bac' => $bac,
            'pv' => $pv,
            'ev' => $ev,
            'ac' => $ac,
            'cv' => $cv,
            'sv' => $sv,
            'cpi' => $cpi,
            'spi' => $spi,
            'eac' => $eac,
            'etc' => $etc,
            'vac' => $vac,
            'saludCosto' => $cpi >= 1.0 ? 'optimo' : ($cpi >= 0.90 ? 'alerta' : 'critico'),
            'saludTiempo' => $spi >= 1.0 ? 'optimo' : ($spi >= 0.90 ? 'alerta' : 'critico'),
        ];
    }

    /**
     * Consolida indicadores EVM a nivel de Programa de Obras (PMU).
     *
     * @return array<string, mixed>
     */
    public function calcularConsolidadoPrograma(): array
    {
        $obras = Obra::where('estado', '!=', 'anulada')->get();

        if ($obras->isEmpty()) {
            return $this->evmDefault();
        }

        $totalBac = 0.0;
        $totalPv = 0.0;
        $totalEv = 0.0;
        $totalAc = 0.0;

        foreach ($obras as $obra) {
            $evmData = $this->calcularEvmObra($obra->id);
            $totalBac += $evmData['bac'];
            $totalPv += $evmData['pv'];
            $totalEv += $evmData['ev'];
            $totalAc += $evmData['ac'];
        }

        $cpiConsolidado = $totalAc > 0 ? round($totalEv / $totalAc, 2) : 1.0;
        $spiConsolidado = $totalPv > 0 ? round($totalEv / $totalPv, 2) : 1.0;
        $pctAvancePromedio = $totalBac > 0 ? round(($totalEv / $totalBac) * 100.0, 1) : 0.0;

        return [
            'totalObras' => $obras->count(),
            'totalBac' => round($totalBac, 2),
            'totalPv' => round($totalPv, 2),
            'totalEv' => round($totalEv, 2),
            'totalAc' => round($totalAc, 2),
            'cpi' => $cpiConsolidado,
            'spi' => $spiConsolidado,
            'avanceFisicoPct' => $pctAvancePromedio,
            'ahorroObrasSoles' => max(0.0, round($totalEv - $totalAc, 2)),
        ];
    }

    protected function evmDefault(): array
    {
        return [
            'bac' => 0.0,
            'pv' => 0.0,
            'ev' => 0.0,
            'ac' => 0.0,
            'cv' => 0.0,
            'sv' => 0.0,
            'cpi' => 1.0,
            'spi' => 1.0,
            'eac' => 0.0,
            'etc' => 0.0,
            'vac' => 0.0,
            'saludCosto' => 'optimo',
            'saludTiempo' => 'optimo',
        ];
    }
}
