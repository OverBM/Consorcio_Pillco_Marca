<?php

namespace App\Domain\Geo\Drivers;

use App\Domain\Geo\Contracts\RuteadorInterface;
use App\Domain\Geo\Dto\Coordenada;
use App\Domain\Geo\Dto\RutaCalculada;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class OsrmDriver implements RuteadorInterface
{
    public function calcular(Coordenada $origen, Coordenada $destino, string $perfil = 'car'): RutaCalculada
    {
        $base = rtrim((string) config('ruteo.osrm.base_url'), '/');
        $coordenadas = "{$origen->lng},{$origen->lat};{$destino->lng},{$destino->lat}";
        $perfilOsrm = $perfil === 'car' ? 'driving' : $perfil;

        $respuesta = Http::timeout(10)->get("{$base}/route/v1/{$perfilOsrm}/{$coordenadas}", [
            'overview' => 'full',
            'geometries' => 'geojson',
        ]);

        if ($respuesta->failed()) {
            throw new RuntimeException('OSRM respondió con estado '.$respuesta->status().'.');
        }

        $ruta = $respuesta->json('routes.0');

        if (! is_array($ruta) || ! isset($ruta['distance'], $ruta['duration'])) {
            throw new RuntimeException('OSRM no devolvió una ruta válida.');
        }

        $geometria = [];

        foreach ($ruta['geometry']['coordinates'] ?? [] as $punto) {
            if (is_array($punto) && count($punto) >= 2) {
                $geometria[] = ['lat' => (float) $punto[1], 'lng' => (float) $punto[0]];
            }
        }

        return new RutaCalculada(
            distanciaM: (float) $ruta['distance'],
            duracionS: (float) $ruta['duration'],
            geometria: $geometria !== [] ? $geometria : [$origen->toArray(), $destino->toArray()],
            fuente: 'osrm',
        );
    }

    public function nombre(): string
    {
        return 'osrm';
    }
}
