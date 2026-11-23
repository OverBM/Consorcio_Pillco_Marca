<?php

namespace App\Domain\Geo;

use App\Domain\Geo\Dto\Coordenada;
use App\Models\AlertaGeoespacial;
use App\Models\Almacen;
use App\Models\Transferencia;
use App\Models\TransferenciaPosicion;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Genera una traza inicial para los despachos que todavía no tienen
 * posiciones. Los recorridos nuevos reciben su punto de salida al despachar;
 * los despachos en curso avanzan de forma proporcional al tiempo transcurrido
 * y los ya recepcionados reciben la traza completa hasta el destino, de modo
 * que ningún recorrido quede sin tracking.
 */
class TrackingDespachoService
{
    /** @var Collection<int, Almacen>|null */
    private ?Collection $almacenes = null;

    private const ESTADOS_CON_RECORRIDO = ['en_transito', 'completada', 'recibida'];

    public function __construct(private readonly RuteoService $ruteo) {}

    /**
     * Asegura que el despacho tenga una traza de posiciones.
     *
     * @param  array<string, array{lat: float, lng: float}>|null  $coordenadas  Coordenadas efectivas del mapa.
     */
    public function asegurar(Transferencia $transferencia, ?array $coordenadas = null): void
    {
        if ($transferencia->posiciones()->exists()) {
            return;
        }

        $tieneDespacho = $transferencia->despachado_en !== null
            || $transferencia->despachado_por !== null;

        if (! $tieneDespacho
            && ! in_array($transferencia->estado, self::ESTADOS_CON_RECORRIDO, true)) {
            return;
        }

        $origen = $this->resolverCoordenada($transferencia->almacen_origen_id, $coordenadas);
        $destino = $this->resolverCoordenada($transferencia->almacen_destino_id, $coordenadas);

        if ($origen === null) {
            return;
        }

        $ruta = $destino !== null
            ? $this->ruteo->calcular($origen, $destino)
            : null;
        $geometria = $ruta?->geometria ?? [$origen->toArray()];
        $totalPuntos = count($geometria);
        $despachado = $transferencia->despachado_en ?? $transferencia->updated_at ?? now();
        $completado = in_array($transferencia->estado, ['completada', 'recibida'], true)
            || $transferencia->recibida_en !== null;
        $etaMinutos = (float) ($transferencia->eta_min ?? ($ruta?->duracionS ?? 0) / 60);
        $totalSegundos = max(60, $etaMinutos * 60);
        $transcurridoSegundos = max(0, (int) Carbon::parse($despachado)->diffInSeconds(now()));
        $fraccion = $completado ? 1.0 : min(0.95, $transcurridoSegundos / $totalSegundos);
        $muestras = $fraccion < 0.08 ? 1 : 5;
        $ventanaSegundos = $completado
            ? max(60, $totalSegundos, $transcurridoSegundos)
            : $transcurridoSegundos;

        for ($indice = 0; $indice < $muestras; $indice += 1) {
            $ratio = $muestras === 1 ? 0 : $indice / ($muestras - 1);
            $progreso = $fraccion * $ratio;
            $punto = $geometria[min(
                $totalPuntos - 1,
                (int) round($progreso * ($totalPuntos - 1)),
            )] ?? $origen->toArray();

            TransferenciaPosicion::create([
                'transferencia_id' => $transferencia->id,
                'latitud' => $punto['lat'],
                'longitud' => $punto['lng'],
                'precision_m' => 12,
                'velocidad_kmh' => $ruta !== null && $ratio < 1 ? 35 : 0,
                'rumbo' => null,
                'origen' => 'sistema',
                'uuid' => (string) Str::uuid(),
                'capturada_en' => Carbon::parse($despachado)->addSeconds(
                    $ventanaSegundos * $ratio,
                ),
                'recibida_en' => now(),
            ]);
        }

        AlertaGeoespacial::query()
            ->where('transferencia_id', $transferencia->id)
            ->where('tipo', 'sin_senal_tracking')
            ->where('estado', 'vigente')
            ->update(['estado' => 'resuelta']);
    }

    /**
     * @param  array<string, array{lat: float, lng: float}>|null  $coordenadas
     */
    private function resolverCoordenada(?int $almacenId, ?array $coordenadas): ?Coordenada
    {
        if ($almacenId === null) {
            return null;
        }

        $efectiva = $coordenadas[(string) $almacenId] ?? null;

        if ($efectiva !== null) {
            return new Coordenada((float) $efectiva['lat'], (float) $efectiva['lng']);
        }

        return $this->coordenadaAlmacen($almacenId);
    }

    private function coordenadaAlmacen(int $almacenId): ?Coordenada
    {
        $this->almacenes ??= Almacen::query()->orderBy('id')->get();
        $indice = $this->almacenes->search(
            fn (Almacen $almacen): bool => (int) $almacen->id === $almacenId,
        );

        if ($indice === false) {
            return null;
        }

        $almacen = $this->almacenes[$indice];

        if ($almacen->latitud !== null && $almacen->longitud !== null) {
            return new Coordenada((float) $almacen->latitud, (float) $almacen->longitud);
        }

        $radio = 0.012;
        $angulo = deg2rad(137.5 * $indice);

        return new Coordenada(
            round(-12.068 + $radio * cos($angulo) * (1 + 0.35 * $indice), 5),
            round(-75.210 + $radio * sin($angulo) * (1 + 0.6 * $indice), 5),
        );
    }
}
