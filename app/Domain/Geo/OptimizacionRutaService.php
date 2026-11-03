<?php

namespace App\Domain\Geo;

use App\Domain\Geo\Drivers\HaversineDriver;
use App\Domain\Geo\Dto\Coordenada;

/**
 * Optimización de rutas multi-parada con vecino más cercano + 2-opt.
 * La matriz de selección usa Haversine (sin cuota); el total final se
 * calcula con el servicio de ruteo real.
 */
class OptimizacionRutaService
{
    public function __construct(
        private readonly RuteoService $ruteo,
        private readonly HaversineDriver $haversine,
    ) {}

    /**
     * @param  list<Coordenada>  $paradas
     * @return array<string, mixed>
     */
    public function optimizar(Coordenada $origen, array $paradas, string $perfil = 'car'): array
    {
        $total = count($paradas);

        if ($total === 0) {
            return [
                'orden' => [],
                'distancia_total_m' => 0.0,
                'duracion_total_s' => 0.0,
                'ahorro_m' => 0.0,
            ];
        }

        $orden = $this->vecinoMasCercano($origen, $paradas);
        $orden = $this->mejorarDosOpt($origen, $paradas, $orden);

        $original = range(0, $total - 1);
        $distanciaOriginal = $this->distanciaSecuencia($origen, $paradas, $original);
        $distanciaOptimizada = $this->distanciaSecuencia($origen, $paradas, $orden);

        $duracion = 0.0;
        $anterior = $origen;

        foreach ($orden as $indice) {
            $duracion += $this->ruteo->calcular($anterior, $paradas[$indice], $perfil)->duracionS;
            $anterior = $paradas[$indice];
        }

        return [
            'orden' => $orden,
            'distancia_total_m' => round($distanciaOptimizada, 1),
            'duracion_total_s' => round($duracion, 1),
            'ahorro_m' => round(max($distanciaOriginal - $distanciaOptimizada, 0), 1),
        ];
    }

    /**
     * @param  list<Coordenada>  $paradas
     * @return list<int>
     */
    private function vecinoMasCercano(Coordenada $origen, array $paradas): array
    {
        $pendientes = array_keys($paradas);
        $orden = [];
        $actual = $origen;

        while ($pendientes !== []) {
            $mejor = null;
            $mejorDistancia = INF;

            foreach ($pendientes as $indice) {
                $distancia = $this->haversine->calcular($actual, $paradas[$indice])->distanciaM;

                if ($distancia < $mejorDistancia) {
                    $mejorDistancia = $distancia;
                    $mejor = $indice;
                }
            }

            $orden[] = (int) $mejor;
            $pendientes = array_values(array_filter($pendientes, fn (int $i): bool => $i !== $mejor));
            $actual = $paradas[(int) $mejor];
        }

        return $orden;
    }

    /**
     * @param  list<Coordenada>  $paradas
     * @param  list<int>  $orden
     * @return list<int>
     */
    private function mejorarDosOpt(Coordenada $origen, array $paradas, array $orden): array
    {
        $mejora = true;
        $iteraciones = 0;

        while ($mejora && $iteraciones < 50) {
            $mejora = false;
            $iteraciones++;
            $total = count($orden);

            for ($i = 0; $i < $total - 1; $i++) {
                for ($j = $i + 1; $j < $total; $j++) {
                    $candidato = $orden;
                    $segmento = array_reverse(array_slice($candidato, $i, $j - $i + 1));
                    array_splice($candidato, $i, $j - $i + 1, $segmento);

                    $actual = $this->distanciaSecuencia($origen, $paradas, $orden);
                    $nuevo = $this->distanciaSecuencia($origen, $paradas, $candidato);

                    if ($nuevo + 0.01 < $actual) {
                        $orden = $candidato;
                        $mejora = true;
                    }
                }
            }
        }

        return $orden;
    }

    /**
     * @param  list<Coordenada>  $paradas
     * @param  list<int>  $orden
     */
    private function distanciaSecuencia(Coordenada $origen, array $paradas, array $orden): float
    {
        $total = 0.0;
        $anterior = $origen;

        foreach ($orden as $indice) {
            $total += $this->haversine->calcular($anterior, $paradas[$indice])->distanciaM;
            $anterior = $paradas[$indice];
        }

        return $total;
    }
}
