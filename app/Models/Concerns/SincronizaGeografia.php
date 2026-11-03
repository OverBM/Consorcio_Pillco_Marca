<?php

namespace App\Models\Concerns;

use Illuminate\Support\Facades\DB;

/**
 * Mantiene columnas `latitud`/`longitud` como fuente legible y sincroniza
 * la columna PostGIS `ubicacion` después de guardar.
 */
trait SincronizaGeografia
{
    public static function bootSincronizaGeografia(): void
    {
        static::saved(function (self $model): void {
            if (DB::getDriverName() !== 'pgsql') {
                return;
            }

            $latitud = $model->getAttribute('latitud');
            $longitud = $model->getAttribute('longitud');

            if ($latitud === null || $longitud === null) {
                return;
            }

            if (! $model->wasRecentlyCreated
                && ! $model->wasChanged(['latitud', 'longitud'])) {
                return;
            }

            DB::update(
                'UPDATE "'.$model->getTable().'" SET ubicacion = ST_SetSRID(ST_MakePoint(?, ?), 4326) WHERE id = ?',
                [(float) $longitud, (float) $latitud, $model->getKey()],
            );
        });
    }

    public function getLatitudAttribute(): ?float
    {
        if (array_key_exists('latitud', $this->attributes)
            && $this->attributes['latitud'] !== null) {
            return (float) $this->attributes['latitud'];
        }

        return $this->coordenadasDesdeTexto()['lat'] ?? null;
    }

    public function getLongitudAttribute(): ?float
    {
        if (array_key_exists('longitud', $this->attributes)
            && $this->attributes['longitud'] !== null) {
            return (float) $this->attributes['longitud'];
        }

        return $this->coordenadasDesdeTexto()['lng'] ?? null;
    }

    public function setLatitudAttribute(mixed $valor): void
    {
        $this->attributes['latitud'] = $valor;
    }

    public function setLongitudAttribute(mixed $valor): void
    {
        $this->attributes['longitud'] = $valor;
    }

    /**
     * Compatibilidad con datos antiguos guardados como "lat,lng" en SQLite.
     *
     * @return array{lat: float, lng: float}|null
     */
    private function coordenadasDesdeTexto(): ?array
    {
        $texto = $this->attributes['ubicacion'] ?? null;

        if (! is_string($texto) || ! str_contains($texto, ',')) {
            return null;
        }

        [$lat, $lng] = array_map('trim', explode(',', $texto, 2));

        if (! is_numeric($lat) || ! is_numeric($lng)) {
            return null;
        }

        return ['lat' => (float) $lat, 'lng' => (float) $lng];
    }
}
