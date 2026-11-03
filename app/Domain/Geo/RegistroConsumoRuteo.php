<?php

namespace App\Domain\Geo;

use App\Models\RuteoConsumo;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Registra el consumo diario de proveedores externos de ruteo y geocoding.
 * Nunca interrumpe la operación si el registro falla.
 */
class RegistroConsumoRuteo
{
    public function registrar(string $driver, bool $exito, bool $geocodificacion = false): void
    {
        try {
            $fecha = now()->toDateString();

            $consumo = RuteoConsumo::query()
                ->whereDate('fecha', $fecha)
                ->where('driver', $driver)
                ->first();

            if ($consumo === null) {
                $consumo = RuteoConsumo::create([
                    'fecha' => $fecha,
                    'driver' => $driver,
                    'llamadas' => 0,
                    'exitos' => 0,
                    'fallos' => 0,
                    'geocodificaciones' => 0,
                ]);
            }

            $consumo->increment('llamadas');
            $consumo->increment($exito ? 'exitos' : 'fallos');

            if ($geocodificacion) {
                $consumo->increment('geocodificaciones');
            }
        } catch (Throwable $error) {
            Log::debug('No se pudo registrar el consumo de ruteo.', [
                'mensaje' => $error->getMessage(),
            ]);
        }
    }
}
