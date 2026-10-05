<?php

namespace App\Domain\Geo;

use App\Models\Obra;
use Illuminate\Support\Facades\DB;

class GeoService
{
    /**
     * Calcula la distancia geodésica entre dos puntos en metros (soporta PostGIS y Haversine en PHP).
     */
    public function calcularDistanciaMetros(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        if (DB::getDriverName() === 'pgsql') {
            try {
                $res = DB::selectOne('
                    SELECT ST_Distance(
                        ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
                        ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography
                    ) as distancia_m
                ', [$lng1, $lat1, $lng2, $lat2]);

                if ($res && isset($res->distancia_m)) {
                    return (float) $res->distancia_m;
                }
            } catch (\Throwable $e) {
                // Fallback a Haversine
            }
        }

        // Fórmula Haversine
        $earthRadius = 6371000.0; // metros
        $latFrom = deg2rad($lat1);
        $lonFrom = deg2rad($lng1);
        $latTo = deg2rad($lat2);
        $lonTo = deg2rad($lng2);

        $latDelta = $latTo - $latFrom;
        $lonDelta = $lonTo - $lonFrom;

        $angle = 2 * asin(sqrt(pow(sin($latDelta / 2), 2) +
            cos($latFrom) * cos($latTo) * pow(sin($lonDelta / 2), 2)));

        return round($angle * $earthRadius, 1);
    }

    /**
     * Calcula el tiempo estimado de llegada (ETA) en minutos considerando factor de ruta y velocidad promedio.
     */
    public function calcularEtaMinutos(float $distanciaLinealMetros): float
    {
        $factorRuta = 1.35;
        $velocidadMediaKmh = 35.0;

        $distanciaCarreteraKm = ($distanciaLinealMetros * $factorRuta) / 1000.0;
        if ($velocidadMediaKmh <= 0) {
            return 0.0;
        }

        $horas = $distanciaCarreteraKm / $velocidadMediaKmh;

        return round($horas * 60, 1);
    }

    /**
     * Evalúa si una marcación cae dentro de la geocerca de la obra (500 metros por defecto).
     */
    public function verificarGeocercaObra(int $obraId, float $latitud, float $longitud): array
    {
        $obra = Obra::find($obraId);
        if (! $obra || ! $obra->latitud || ! $obra->longitud) {
            return [
                'dentro_geocerca' => true,
                'distancia_a_obra_m' => 0.0,
            ];
        }

        $distancia = $this->calcularDistanciaMetros(
            $latitud,
            $longitud,
            (float) $obra->latitud,
            (float) $obra->longitud
        );

        return [
            'dentro_geocerca' => $distancia <= 500.0,
            'distancia_a_obra_m' => $distancia,
        ];
    }
}
