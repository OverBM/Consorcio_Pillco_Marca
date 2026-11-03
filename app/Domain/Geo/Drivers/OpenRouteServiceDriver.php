<?php

namespace App\Domain\Geo\Drivers;

use App\Domain\Geo\Contracts\RuteadorInterface;
use App\Domain\Geo\Dto\Coordenada;
use App\Domain\Geo\Dto\RutaCalculada;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class OpenRouteServiceDriver implements RuteadorInterface
{
    public function calcular(Coordenada $origen, Coordenada $destino, string $perfil = 'car'): RutaCalculada
    {
        $clave = (string) config('ruteo.ors.key');

        if ($clave === '') {
            throw new RuntimeException('ORS_API_KEY no está configurada.');
        }

        $base = rtrim((string) config('ruteo.ors.base_url'), '/');
        $perfilOrs = $perfil === 'car' ? 'driving-car' : $perfil;

        $respuesta = Http::withHeaders(['Authorization' => $clave])
            ->timeout(15)
            ->post("{$base}/v2/directions/{$perfilOrs}/geojson", [
                'coordinates' => [
                    [$origen->lng, $origen->lat],
                    [$destino->lng, $destino->lat],
                ],
            ]);

        if ($respuesta->failed()) {
            throw new RuntimeException('ORS respondió con estado '.$respuesta->status().'.');
        }

        $propiedades = $respuesta->json('features.0.properties.summary');

        if (! is_array($propiedades) || ! isset($propiedades['distance'], $propiedades['duration'])) {
            throw new RuntimeException('ORS no devolvió una ruta válida.');
        }

        $geometria = [];

        foreach ($respuesta->json('features.0.geometry.coordinates', []) as $punto) {
            if (is_array($punto) && count($punto) >= 2) {
                $geometria[] = ['lat' => (float) $punto[1], 'lng' => (float) $punto[0]];
            }
        }

        return new RutaCalculada(
            distanciaM: (float) $propiedades['distance'],
            duracionS: (float) $propiedades['duration'],
            geometria: $geometria !== [] ? $geometria : [$origen->toArray(), $destino->toArray()],
            fuente: 'ors',
        );
    }

    public function nombre(): string
    {
        return 'ors';
    }
}
