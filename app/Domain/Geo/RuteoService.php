<?php

namespace App\Domain\Geo;

use App\Domain\Geo\Contracts\RuteadorInterface;
use App\Domain\Geo\Drivers\HaversineDriver;
use App\Domain\Geo\Dto\Coordenada;
use App\Domain\Geo\Dto\RutaCalculada;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Ruteo con caché, presupuesto diario y circuit breaker.
 * Siempre devuelve una ruta: si el proveedor falla, usa Haversine.
 */
class RuteoService
{
    public function __construct(
        private readonly RuteadorInterface $principal,
        private readonly HaversineDriver $respaldo,
        private readonly RegistroConsumoRuteo $consumo,
    ) {}

    public function calcular(Coordenada $origen, Coordenada $destino, string $perfil = 'car'): RutaCalculada
    {
        $clave = 'ruteo:'.sha1(json_encode([
            'driver' => $this->principal->nombre(),
            'origen' => $origen->toArray(),
            'destino' => $destino->toArray(),
            'perfil' => $perfil,
        ]));

        $cached = Cache::get($clave);

        // La caché puede contener objetos serializados por una versión anterior
        // del DTO; en ese caso se descarta y se vuelve a calcular.
        if ($cached instanceof RutaCalculada) {
            return $cached;
        }

        if ($cached !== null) {
            Cache::forget($clave);
        }

        $ruta = $this->ejecutarConProteccion($origen, $destino, $perfil);

        Cache::put($clave, $ruta, (int) config('ruteo.cache_ttl', 86400));

        return $ruta;
    }

    public function distanciaMetros(Coordenada $origen, Coordenada $destino): float
    {
        return $this->respaldo->calcular($origen, $destino)->distanciaM;
    }

    private function ejecutarConProteccion(Coordenada $origen, Coordenada $destino, string $perfil): RutaCalculada
    {
        if ($this->circuitoAbierto()) {
            return $this->respaldo->calcular($origen, $destino, $perfil);
        }

        if ($this->presupuestoAgotado()) {
            Log::warning('Presupuesto diario de ruteo agotado; se usa Haversine.');

            return $this->respaldo->calcular($origen, $destino, $perfil);
        }

        try {
            $this->consumirPresupuesto();
            $ruta = $this->principal->calcular($origen, $destino, $perfil);
            $this->consumo->registrar($this->principal->nombre(), true);
            Cache::forget('ruteo:fallos');

            return $ruta;
        } catch (Throwable $error) {
            $this->consumo->registrar($this->principal->nombre(), false);
            $this->registrarFallo($error);

            return $this->respaldo->calcular($origen, $destino, $perfil);
        }
    }

    private function circuitoAbierto(): bool
    {
        return (int) Cache::get('ruteo:abierto_hasta', 0) > now()->timestamp;
    }

    private function presupuestoAgotado(): bool
    {
        $llamadas = (int) Cache::get($this->clavePresupuesto(), 0);

        return $llamadas >= (int) config('ruteo.presupuesto_diario', 1500);
    }

    private function consumirPresupuesto(): void
    {
        $clave = $this->clavePresupuesto();
        Cache::put($clave, (int) Cache::get($clave, 0) + 1, now()->endOfDay());
    }

    private function clavePresupuesto(): string
    {
        return 'ruteo:llamadas:'.now()->toDateString();
    }

    private function registrarFallo(Throwable $error): void
    {
        $fallos = (int) Cache::get('ruteo:fallos', 0) + 1;
        Cache::put('ruteo:fallos', $fallos, now()->addHour());

        if ($fallos >= (int) config('ruteo.fallos_para_abrir', 3)) {
            Cache::put(
                'ruteo:abierto_hasta',
                now()->addMinutes((int) config('ruteo.circuito_minutos', 5))->timestamp,
                now()->addMinutes((int) config('ruteo.circuito_minutos', 5)),
            );
        }

        Log::warning('Fallo del proveedor de ruteo; se usa Haversine.', [
            'driver' => $this->principal->nombre(),
            'mensaje' => $error->getMessage(),
        ]);
    }
}
