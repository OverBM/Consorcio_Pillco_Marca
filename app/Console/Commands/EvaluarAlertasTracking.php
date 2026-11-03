<?php

namespace App\Console\Commands;

use App\Domain\Geo\Drivers\HaversineDriver;
use App\Domain\Geo\Dto\Coordenada;
use App\Models\AlertaGeoespacial;
use App\Models\Despacho;
use App\Models\DespachoPosicion;
use App\Support\NotificadorOperativo;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class EvaluarAlertasTracking extends Command
{
    protected $signature = 'tracking:evaluar-alertas';

    protected $description = 'Evalúa desvíos, detenciones, salidas de geocerca y pérdida de señal.';

    public function handle(HaversineDriver $haversine): int
    {
        $despachos = Despacho::query()
            ->with(['transferencia.almacenDestino', 'transferencia.confirmacionRecepcion'])
            ->whereHas('transferencia', fn ($query) => $query->where('estado', 'en_transito'))
            ->get();

        $creadas = 0;

        foreach ($despachos as $despacho) {
            $transferencia = $despacho->transferencia;

            if ($transferencia === null || $transferencia->confirmacionRecepcion !== null) {
                continue;
            }

            $posiciones = DespachoPosicion::query()
                ->where('despacho_id', $despacho->id)
                ->orderByDesc('capturada_en')
                ->limit(5)
                ->get();

            if ($posiciones->isEmpty()) {
                if ($despacho->despachado_en !== null
                    && Carbon::parse($despacho->despachado_en)->lt(now()->subMinutes(10))) {
                    $creadas += $this->registrar($despacho, 'sin_senal_tracking', 'alta', 'Sin posiciones desde el despacho.');
                }

                continue;
            }

            $ultima = $posiciones->first();
            $antiguedad = (int) round(Carbon::parse($ultima->capturada_en)->diffInMinutes(now()));

            if ($antiguedad > 10) {
                $creadas += $this->registrar(
                    $despacho,
                    'sin_senal_tracking',
                    'alta',
                    "Sin señal desde hace {$antiguedad} minutos.",
                    tiempoMin: (float) $antiguedad,
                );
            }

            $recientes = $posiciones->filter(
                fn (DespachoPosicion $posicion) => Carbon::parse($posicion->capturada_en)->gt(now()->subMinutes(20))
            );

            if ($recientes->count() >= 3
                && $recientes->avg(fn (DespachoPosicion $posicion) => (float) $posicion->velocidad_kmh) < 1.0) {
                $creadas += $this->registrar($despacho, 'detencion_prolongada', 'media', 'Vehículo detenido por más de 20 minutos.');
            }

            $destino = $transferencia->almacenDestino;

            if ($destino !== null && $destino->latitud !== null && $destino->longitud !== null) {
                $punto = new Coordenada((float) $ultima->latitud, (float) $ultima->longitud);
                $destinoCoord = new Coordenada((float) $destino->latitud, (float) $destino->longitud);
                $distanciaDestino = $haversine->calcular($punto, $destinoCoord)->distanciaM;

                if ($distanciaDestino <= 1000 && $distanciaDestino > (float) $destino->radio_geocerca_m) {
                    $creadas += $this->registrar(
                        $despacho,
                        'salida_geocerca',
                        'media',
                        'El vehículo está cerca del destino pero fuera de la geocerca.',
                        distanciaM: $distanciaDestino,
                    );
                }
            }

            $origen = $transferencia->almacenOrigen;

            if ($origen !== null && $origen->latitud !== null && $origen->longitud !== null) {
                $desvio = $this->distanciaALinea(
                    new Coordenada((float) $ultima->latitud, (float) $ultima->longitud),
                    new Coordenada((float) $origen->latitud, (float) $origen->longitud),
                    new Coordenada((float) ($destino?->latitud ?? $origen->latitud), (float) ($destino?->longitud ?? $origen->longitud)),
                );

                if ($desvio > 500) {
                    $creadas += $this->registrar(
                        $despacho,
                        'desvio_ruta',
                        'alta',
                        'Desvío de la ruta recta superior a 500 m.',
                        distanciaM: $desvio,
                    );
                }
            }

            if ($transferencia->eta_min !== null && $despacho->despachado_en !== null) {
                $eta = Carbon::parse($despacho->despachado_en)->addMinutes((float) $transferencia->eta_min);

                if (now()->gt($eta->copy()->addMinutes(15))) {
                    $creadas += $this->registrar(
                        $despacho,
                        'eta_vencida',
                        'media',
                        'La ETA se venció hace más de 15 minutos.',
                        tiempoMin: (float) $eta->diffInMinutes(now()),
                    );
                }
            }
        }

        $this->info("Alertas geoespaciales generadas: {$creadas}.");

        return self::SUCCESS;
    }

    private function registrar(
        Despacho $despacho,
        string $tipo,
        string $severidad,
        string $detalle,
        ?float $distanciaM = null,
        ?float $tiempoMin = null,
    ): int {
        $clave = "{$tipo}:{$despacho->id}:".now()->toDateString();

        $alerta = AlertaGeoespacial::firstOrCreate(
            ['clave_idempotente' => $clave],
            [
                'despacho_id' => $despacho->id,
                'tipo' => $tipo,
                'severidad' => $severidad,
                'distancia_m' => $distanciaM,
                'tiempo_min' => $tiempoMin,
                'detalle' => $detalle,
                'estado' => 'vigente',
            ],
        );

        if (! $alerta->wasRecentlyCreated) {
            return 0;
        }

        NotificadorOperativo::aRoles(
            ['jefe_logistica_compras', 'administrador_sistema'],
            'alerta_geoespacial',
            'Alerta de tracking: '.$tipo,
            mb_substr($detalle, 0, 240),
            'despacho',
            $despacho->id,
        );

        return 1;
    }

    private function distanciaALinea(Coordenada $punto, Coordenada $inicio, Coordenada $fin): float
    {
        $radio = 6371000.0;
        $lat1 = deg2rad($punto->lat);
        $lat2 = deg2rad($inicio->lat);
        $lat3 = deg2rad($fin->lat);
        $dLng13 = deg2rad($fin->lng - $punto->lng);
        $dLng12 = deg2rad($fin->lng - $inicio->lng);

        $bearing13 = atan2(
            sin($dLng13) * cos($lat1),
            cos($lat3) * sin($lat1) - sin($lat3) * cos($lat1) * cos($dLng13),
        );
        $bearing12 = atan2(
            sin($dLng12) * cos($lat2),
            cos($lat3) * sin($lat2) - sin($lat3) * cos($lat2) * cos($dLng12),
        );

        $delta13 = 2 * asin(min(1.0, sqrt(
            sin(($lat3 - $lat1) / 2) ** 2
            + cos($lat1) * cos($lat3) * sin($dLng13 / 2) ** 2
        )));

        return abs(asin(sin($delta13) * sin($bearing13 - $bearing12)) * $radio);
    }
}
