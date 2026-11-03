<?php

namespace App\Domain\Geo;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Geocodificación directa e inversa con ORS y caché persistente.
 */
class GeocodificacionService
{
    public function __construct(private readonly RegistroConsumoRuteo $consumo) {}

    /**
     * @return array{lat: float, lng: float, etiqueta: string, precision: float|null}|null
     */
    public function geocodificar(string $direccion): ?array
    {
        $texto = trim($direccion);

        if ($texto === '') {
            return null;
        }

        return Cache::remember(
            'geocode:'.md5(mb_strtolower($texto)),
            (int) config('ruteo.geo_cache_ttl', 2592000),
            fn (): ?array => $this->consultar('/geocode/search', [
                'text' => $texto,
                'size' => 1,
                'boundary.country' => 'PER',
            ]),
        );
    }

    /**
     * Sugerencias de dirección para autocompletar el buscador.
     *
     * @return list<array{etiqueta: string, lat: float, lng: float, precision: float|null}>
     */
    public function sugerencias(string $consulta, int $limite = 5): array
    {
        $texto = trim($consulta);

        if (mb_strlen($texto) < 2) {
            return [];
        }

        $limite = max(1, min($limite, 8));

        return Cache::remember(
            'geocode:sug:'.md5(mb_strtolower($texto).':'.$limite),
            (int) config('ruteo.geo_cache_ttl', 2592000),
            fn (): array => $this->buscarSugerencias($texto, $limite),
        );
    }

    /**
     * @return list<array{etiqueta: string, lat: float, lng: float, precision: float|null}>
     */
    private function buscarSugerencias(string $texto, int $limite): array
    {
        $clave = (string) config('ruteo.ors.key');

        if ($clave === '') {
            return [];
        }

        try {
            $base = rtrim((string) config('ruteo.ors.base_url'), '/');
            // "San Carlos, Huancayo" sesga a Huancayo; la parte antes de la
            // coma busca el lugar concreto dentro del rectángulo de Junín.
            $consulta = str_contains($texto, ',')
                ? trim(explode(',', $texto, 2)[0])
                : $texto;

            if (mb_strlen($consulta) < 2) {
                $consulta = $texto;
            }

            $respuesta = Http::timeout(10)->get($base.'/geocode/search', [
                'api_key' => $clave,
                'text' => $consulta,
                'size' => $limite,
                'boundary.country' => 'PER',
                // Prioriza el Valle del Mantaro (Junín) para direcciones locales.
                'boundary.rect.min_lon' => -76.5,
                'boundary.rect.min_lat' => -13.0,
                'boundary.rect.max_lon' => -74.5,
                'boundary.rect.max_lat' => -11.5,
            ]);

            $this->consumo->registrar('ors', $respuesta->successful(), true);

            if ($respuesta->failed()) {
                return [];
            }

            return collect($respuesta->json('features', []))
                ->map(function (array $feature): array {
                    $coordenadas = $feature['geometry']['coordinates'] ?? [null, null];

                    return [
                        'etiqueta' => (string) ($feature['properties']['label'] ?? ''),
                        'lat' => (float) ($coordenadas[1] ?? 0),
                        'lng' => (float) ($coordenadas[0] ?? 0),
                        'precision' => isset($feature['properties']['confidence'])
                            ? (float) $feature['properties']['confidence']
                            : null,
                    ];
                })
                ->filter(fn (array $fila): bool => $fila['etiqueta'] !== '')
                ->take($limite)
                ->values()
                ->all();
        } catch (Throwable $error) {
            $this->consumo->registrar('ors', false, true);
            Log::warning('Fallo de sugerencias de dirección.', ['mensaje' => $error->getMessage()]);

            return [];
        }
    }

    /**
     * @return array{lat: float, lng: float, etiqueta: string, precision: float|null}|null
     */
    public function reversa(float $lat, float $lng): ?array
    {
        return Cache::remember(
            'geocode:rev:'.md5("{$lat},{$lng}"),
            (int) config('ruteo.geo_cache_ttl', 2592000),
            fn (): ?array => $this->consultar('/geocode/reverse', [
                'point.lat' => $lat,
                'point.lon' => $lng,
                'size' => 1,
            ]),
        );
    }

    /**
     * @param  array<string, mixed>  $parametros
     * @return array{lat: float, lng: float, etiqueta: string, precision: float|null}|null
     */
    private function consultar(string $ruta, array $parametros): ?array
    {
        $clave = (string) config('ruteo.ors.key');

        if ($clave === '') {
            return null;
        }

        try {
            $base = rtrim((string) config('ruteo.ors.base_url'), '/');
            $respuesta = Http::timeout(10)->get($base.$ruta, [
                ...$parametros,
                'api_key' => $clave,
            ]);

            $this->consumo->registrar('ors', $respuesta->successful(), true);

            if ($respuesta->failed()) {
                return null;
            }

            $feature = $respuesta->json('features.0');
            $coordenadas = $feature['geometry']['coordinates'] ?? null;

            if (! is_array($coordenadas) || count($coordenadas) < 2) {
                return null;
            }

            return [
                'lat' => (float) $coordenadas[1],
                'lng' => (float) $coordenadas[0],
                'etiqueta' => (string) ($feature['properties']['label'] ?? ''),
                'precision' => isset($feature['properties']['confidence'])
                    ? (float) $feature['properties']['confidence']
                    : null,
            ];
        } catch (Throwable $error) {
            $this->consumo->registrar('ors', false, true);
            Log::warning('Fallo de geocodificación.', ['mensaje' => $error->getMessage()]);

            return null;
        }
    }
}
