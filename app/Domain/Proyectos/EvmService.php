<?php

namespace App\Domain\Proyectos;

class EvmService
{
    /**
     * Calcular métricas EVM (Earned Value Management) bajo estándar PMI / PMU.
     *
     * @return array{
     *     pv: float,
     *     ev: float,
     *     ac: float,
     *     cv: float,
     *     sv: float,
     *     cpi: float,
     *     spi: float,
     *     bac: float,
     *     eac: float,
     *     vac: float,
     *     tcpi: float,
     *     estado_costo: string,
     *     estado_cronograma: string
     * }
     */
    public function calcularMetricas(float $pv, float $ev, float $ac, float $bac): array
    {
        $cv = round($ev - $ac, 2);
        $sv = round($ev - $pv, 2);

        $cpi = $ac > 0 ? round($ev / $ac, 4) : 1.0;
        $spi = $pv > 0 ? round($ev / $pv, 4) : 1.0;

        $eac = $cpi > 0 ? round($bac / $cpi, 2) : $bac;
        $vac = round($bac - $eac, 2);

        $remanentePresupuesto = $bac - $ac;
        $remanenteTrabajo = $bac - $ev;
        $tcpi = $remanentePresupuesto > 0 ? round($remanenteTrabajo / $remanentePresupuesto, 4) : 1.0;

        $estadoCosto = match (true) {
            $cpi >= 1.05 => 'bajo_presupuesto',
            $cpi >= 0.95 => 'conforme',
            default => 'sobrecosto',
        };

        $estadoCronograma = match (true) {
            $spi >= 1.05 => 'adelantado',
            $spi >= 0.95 => 'en_tiempo',
            default => 'retrasado',
        };

        return [
            'pv' => $pv,
            'ev' => $ev,
            'ac' => $ac,
            'cv' => $cv,
            'sv' => $sv,
            'cpi' => $cpi,
            'spi' => $spi,
            'bac' => $bac,
            'eac' => $eac,
            'vac' => $vac,
            'tcpi' => $tcpi,
            'estado_costo' => $estadoCosto,
            'estado_cronograma' => $estadoCronograma,
        ];
    }
}
