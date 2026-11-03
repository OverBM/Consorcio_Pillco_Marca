<?php

namespace App\Domain\Geo\Drivers;

use App\Domain\Geo\Contracts\RuteadorInterface;
use App\Domain\Geo\Dto\Coordenada;
use App\Domain\Geo\Dto\RutaCalculada;

/**
 * Respaldo local: distancia geodésica corregida por factor de ruta.
 * Siempre disponible, sin red ni cuota.
 */
class HaversineDriver implements RuteadorInterface
{
    public function calcular(Coordenada $origen, Coordenada $destino, string $perfil = 'car'): RutaCalculada
    {
        $distancia = $this->distanciaMetros($origen, $destino) * (float) config('ruteo.factor_ruta', 1.35);
        $velocidad = max((float) config('ruteo.velocidad_kmh', 35), 1);
        $duracion = ($distancia / 1000) / $velocidad * 3600;

        return new RutaCalculada(
            distanciaM: $distancia,
            duracionS: $duracion,
            geometria: [$origen->toArray(), $destino->toArray()],
            fuente: 'haversine',
        );
    }

    public function nombre(): string
    {
        return 'haversine';
    }

    private function distanciaMetros(Coordenada $origen, Coordenada $destino): float
    {
        $radio = 6371000.0;
        $lat1 = deg2rad($origen->lat);
        $lat2 = deg2rad($destino->lat);
        $deltaLat = deg2rad($destino->lat - $origen->lat);
        $deltaLng = deg2rad($destino->lng - $origen->lng);

        $a = sin($deltaLat / 2) ** 2
            + cos($lat1) * cos($lat2) * sin($deltaLng / 2) ** 2;

        return 2 * $radio * asin(min(1.0, sqrt($a)));
    }
}
