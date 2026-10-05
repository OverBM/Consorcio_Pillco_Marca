<?php

namespace App\Domain\Excedentes;

use App\Domain\Geo\GeoService;
use App\Models\ParametroSistema;
use Illuminate\Support\Facades\DB;

class RankingReceptoresService
{
    public function __construct(
        protected GeoService $geoService
    ) {}

    /**
     * Obtiene y califica las obras receptoras candidatas para transferir un excedente o material crítico.
     */
    public function obtenerRankingObrasReceptoras(
        int $almacenOrigenId,
        int $materialId,
        float $cantidadDisponible,
        bool $esUrgente = false
    ): array {
        $radioM = (int) ParametroSistema::getValor('geo.radio_busqueda_m', 50000);

        // Pesos configurables de parametros_sistema
        $pesoCercania = (float) ParametroSistema::getValor('rank.peso_cercania', 0.35);
        $pesoUrgencia = (float) ParametroSistema::getValor('rank.peso_urgencia', 0.25);
        $pesoCobertura = (float) ParametroSistema::getValor('rank.peso_cobertura', 0.20);
        $pesoTransporte = (float) ParametroSistema::getValor('rank.peso_transporte', 0.10);
        $pesoCriticidad = (float) ParametroSistema::getValor('rank.peso_criticidad', 0.10);

        // Invocar la función PostGIS fn_obras_con_deficit
        $candidatos = DB::select('
            SELECT almacen_id, obra_id, deficit, distancia_m
            FROM fn_obras_con_deficit(?, ?, ?)
        ', [$materialId, $almacenOrigenId, $radioM]);

        $resultados = [];

        foreach ($candidatos as $c) {
            $distanciaM = (float) $c->distancia_m;
            $deficit = (float) $c->deficit;
            $etaMin = $this->geoService->estimarEtaMinutos($distanciaM);

            // Factor de cercanía normalizado (menor distancia -> mayor puntaje)
            $factorCercania = max(0.0, 1.0 - ($distanciaM / max(1, $radioM)));

            // Factor de cobertura (% de déficit que se puede cubrir)
            $factorCobertura = $deficit > 0 ? min(1.0, $cantidadDisponible / $deficit) : 0.5;

            // Factor de urgencia
            $factorUrgencia = $esUrgente ? 1.0 : 0.5;

            // Factor transporte (disponibilidad de ruta)
            $factorTransporte = 0.8;

            // Factor criticidad
            $factorCriticidad = 0.9;

            $puntaje = ($factorCercania * $pesoCercania) +
                       ($factorUrgencia * $pesoUrgencia) +
                       ($factorCobertura * $pesoCobertura) +
                       ($factorTransporte * $pesoTransporte) +
                       ($factorCriticidad * $pesoCriticidad);

            $resultados[] = [
                'almacen_id' => $c->almacen_id,
                'obra_id' => $c->obra_id,
                'deficit' => $deficit,
                'distancia_m' => $distanciaM,
                'eta_min' => $etaMin,
                'puntaje' => round($puntaje, 4),
            ];
        }

        // Ordenar por puntaje descendente
        usort($resultados, fn ($a, $b) => $b['puntaje'] <=> $a['puntaje']);

        return [
            'pesos_aplicados' => [
                'cercania' => $pesoCercania,
                'urgencia' => $pesoUrgencia,
                'cobertura' => $pesoCobertura,
                'transporte' => $pesoTransporte,
                'criticidad' => $pesoCriticidad,
            ],
            'resultados' => $resultados,
        ];
    }
}
