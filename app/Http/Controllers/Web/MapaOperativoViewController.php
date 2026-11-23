<?php

namespace App\Http\Controllers\Web;

use App\Domain\Analitica\RedistribucionAnaliticaService;
use App\Domain\Geo\Dto\Coordenada;
use App\Domain\Geo\ResumenCuotaRuteo;
use App\Domain\Geo\RuteoService;
use App\Domain\Geo\TrackingDespachoService;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Web\Concerns\FiltraContextoOperativo;
use App\Models\AlertaGeoespacial;
use App\Models\Almacen;
use App\Models\Material;
use App\Models\Obra;
use App\Models\StockAlmacen;
use App\Models\Transferencia;
use App\Models\TransferenciaPosicion;
use Inertia\Inertia;
use Inertia\Response;

class MapaOperativoViewController extends Controller
{
    use FiltraContextoOperativo;

    public function __construct(
        private readonly RuteoService $ruteo,
        private readonly ResumenCuotaRuteo $cuotaRuteo,
        private readonly RedistribucionAnaliticaService $redistribucion,
        private readonly TrackingDespachoService $tracking,
    ) {}

    private const MANTARO_LAT = -12.068;

    private const MANTARO_LNG = -75.210;

    public function index(): Response
    {
        $obras = $this->filtrarContextoObras(Obra::query())->orderBy('id')->get();
        $almacenes = $this->filtrarContextoAlmacenes(Almacen::query())->orderBy('id')->get();
        $stock = $this->filtrarContextoAlmacen(StockAlmacen::query())
            ->with('material:id,nombre,unidad_id')
            ->get();

        $materiales = Material::query()
            ->where('activo', true)
            ->with(['unidad:id,codigo', 'categoria:id,nombre'])
            ->get(['id', 'codigo', 'nombre', 'unidad_id', 'categoria_id']);

        $stockMinimoMaterial = $stock
            ->groupBy('material_id')
            ->map(fn ($filas): float => (float) $filas->max('stock_minimo'));

        $despachos = Transferencia::query()
            ->with([
                'almacenDestino:id,latitud,longitud,nombre',
                'posiciones' => fn ($query) => $query->latest('capturada_en')->limit(1),
            ])
            ->where('estado', 'en_transito')
            ->whereNotNull('despachado_por')
            ->get(['id', 'codigo', 'almacen_origen_id', 'almacen_destino_id', 'estado', 'eta_min', 'distancia_m', 'despachado_en', 'recibida_en']);

        $transferencias = Transferencia::query()
            ->with([
                'almacenOrigen:id,nombre,ubicacion',
                'almacenDestino:id,nombre,ubicacion',
            ])
            ->whereIn('estado', ['sugerida', 'solicitada', 'aprobada', 'en_transito'])
            ->limit(20)
            ->get(['id', 'codigo', 'almacen_origen_id', 'almacen_destino_id', 'estado', 'eta_min']);

        $coordenadas = $this->coordenadasDeAlmacenes($almacenes);

        foreach ($despachos as $despacho) {
            $this->tracking->asegurar($despacho, $coordenadas);
        }

        $despachos->load([
            'posiciones' => fn ($query) => $query->latest('capturada_en')->limit(1),
        ]);

        $posicionesPorTransferencia = $despachos
            ->mapWithKeys(fn (Transferencia $transferencia): array => [
                $transferencia->id => $transferencia->posiciones->first(),
            ]);
        $sugerencias = $this->redistribucion->sugerencias(null, null, 6);
        $sugerencias = array_map(
            function (array $sugerencia) use ($coordenadas): array {
                $origen = $coordenadas[(string) $sugerencia['origen_id']] ?? null;
                $destino = $coordenadas[(string) $sugerencia['destino_id']] ?? null;

                if ($origen !== null && $destino !== null) {
                    $ruta = $this->ruteo->calcular(
                        new Coordenada((float) $origen['lat'], (float) $origen['lng']),
                        new Coordenada((float) $destino['lat'], (float) $destino['lng']),
                    );

                    $sugerencia['geometria'] = $ruta->geometria;
                    $sugerencia['distancia_km'] = round($ruta->distanciaM / 1000, 2);
                    $sugerencia['eta_min'] = round($ruta->duracionS / 60, 1);
                }

                return $sugerencia;
            },
            $sugerencias,
        );

        return Inertia::render('MapaOperativoPage', [
            'obrasDb' => $this->mapearObras($obras),
            'almacenesDb' => $this->mapearAlmacenes($almacenes),
            'materialesDb' => $materiales->map(fn (Material $material): array => [
                'id' => (string) $material->id,
                'codigo' => $material->codigo,
                'nombre' => $material->nombre,
                'unidad' => $material->unidad?->codigo ?? 'UND',
                'categoria' => $material->categoria?->nombre ?? 'General',
                'stockMinimo' => round((float) ($stockMinimoMaterial[$material->id] ?? 0), 3),
            ])->values(),
            'stock' => [
                'stock' => $this->stockAnidado($stock),
                'reservas' => [],
            ],
            'rutasDb' => $transferencias->map(fn (Transferencia $transferencia): array => $this->mapearRuta(
                $transferencia,
                $posicionesPorTransferencia->get($transferencia->id),
                $coordenadas,
            ))->values(),
            'sugerenciasDb' => $sugerencias,
            'despachosDb' => $despachos->map(fn (Transferencia $despacho): array => [
                'id' => $despacho->id,
                'codigo' => $despacho->codigo,
                'transferenciaId' => $despacho->id,
                'etaMin' => $despacho->eta_min,
                'etaRestanteMin' => $this->etaDesdePosicion(
                    $despacho->posiciones->first(),
                    $despacho->almacenDestino,
                ),
                'distanciaM' => $despacho->distancia_m,
                'ultimaPosicion' => $despacho->posiciones->first()?->only([
                    'latitud', 'longitud', 'velocidad_kmh', 'capturada_en',
                ]),
            ])->values(),
            'alertasGeoDb' => AlertaGeoespacial::query()
                ->with('despacho')
                ->where('estado', 'vigente')
                ->latest('id')
                ->limit(30)
                ->get(),
            'calorDb' => $this->construirCalor($stock),
            'cuotaRuteo' => $this->cuotaRuteo->hoy(),
        ]);
    }

    /**
     * Coordenadas del mapa, incluyendo la dispersión determinista cuando el
     * almacén no tiene latitud/longitud en base.
     *
     * @return array<string, array{lat: float, lng: float}>
     */
    private function coordenadasDeAlmacenes($almacenes): array
    {
        $coordenadas = [];

        foreach ($almacenes->values() as $indice => $almacen) {
            $coordenadas[(string) $almacen->id] = $this->coords(
                $almacen->latitud,
                $almacen->longitud,
                $indice,
            );
        }

        return $coordenadas;
    }

    /**
     * @param  array<string, array{lat: float, lng: float}>  $coordenadas
     * @return array<string, mixed>
     */
    private function mapearRuta(
        Transferencia $transferencia,
        ?TransferenciaPosicion $posicion,
        array $coordenadas,
    ): array {
        $destino = $coordenadas[(string) $transferencia->almacen_destino_id] ?? null;
        $origen = $coordenadas[(string) $transferencia->almacen_origen_id] ?? null;
        $etaRestante = null;
        $distanciaRestante = null;
        $geometriaRestante = [];
        $rutaPrincipal = null;

        if ($origen !== null && $destino !== null) {
            $rutaPrincipal = $this->ruteo->calcular(
                new Coordenada((float) $origen['lat'], (float) $origen['lng']),
                new Coordenada((float) $destino['lat'], (float) $destino['lng']),
            );
        }

        if ($posicion !== null && $destino !== null) {
            $ruta = $this->ruteo->calcular(
                new Coordenada((float) $posicion->latitud, (float) $posicion->longitud),
                new Coordenada((float) $destino['lat'], (float) $destino['lng']),
            );

            $etaRestante = round($ruta->duracionS / 60, 1);
            $distanciaRestante = round($ruta->distanciaM);
            $geometriaRestante = $ruta->geometria;
        }

        return [
            'id' => (string) $transferencia->id,
            'codigo' => $transferencia->codigo,
            'origenId' => (string) $transferencia->almacen_origen_id,
            'destinoId' => (string) $transferencia->almacen_destino_id,
            'estado' => match ($transferencia->estado) {
                'en_transito' => 'en-transito',
                'aprobada', 'solicitada' => 'pendiente',
                default => 'pendiente',
            },
            'etaMin' => $transferencia->eta_min !== null
                ? (float) $transferencia->eta_min
                : ($rutaPrincipal !== null ? round($rutaPrincipal->duracionS / 60, 1) : null),
            'etaRestanteMin' => $etaRestante,
            'distanciaRestanteM' => $distanciaRestante,
            'despachoId' => $transferencia->id,
            'posicionActual' => $posicion !== null ? [
                'lat' => (float) $posicion->latitud,
                'lng' => (float) $posicion->longitud,
                'velocidadKmh' => $posicion->velocidad_kmh !== null ? (float) $posicion->velocidad_kmh : null,
                'capturadaEn' => $posicion->capturada_en,
            ] : null,
            'geometria' => $rutaPrincipal?->geometria ?? [],
            'geometriaRestante' => $geometriaRestante,
        ];
    }

    private function etaDesdePosicion(?TransferenciaPosicion $posicion, ?Almacen $destino): ?float
    {
        if ($posicion === null || $destino === null
            || $destino->latitud === null || $destino->longitud === null) {
            return null;
        }

        return round($this->ruteo->calcular(
            new Coordenada((float) $posicion->latitud, (float) $posicion->longitud),
            new Coordenada((float) $destino->latitud, (float) $destino->longitud),
        )->duracionS / 60, 1);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function mapearObras($obras): array
    {
        return $obras->values()->map(fn (Obra $obra, int $indice): array => [
            'id' => (string) $obra->id,
            'codigo' => $obra->codigo,
            'nombre' => $obra->nombre,
            'distrito' => $obra->distrito ?? 'Huancayo',
            'responsable' => 'Ing. Residente',
            'estado' => $this->estadoObra($obra->estado),
            'pctAvance' => (float) $obra->avance_fisico_pct,
            'presupuesto' => (float) $obra->presupuesto_base,
            'coords' => $this->coords($obra->latitud, $obra->longitud, $indice),
            'descripcion' => $obra->direccion ?? '',
            'fechaInicio' => $obra->fecha_inicio?->format('Y-m-d') ?? '',
        ])->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function mapearAlmacenes($almacenes): array
    {
        return $almacenes->values()->map(fn (Almacen $almacen, int $indice): array => [
            'id' => (string) $almacen->id,
            'obraId' => (string) $almacen->obra_id,
            'codigo' => $almacen->codigo,
            'nombre' => $almacen->nombre,
            'tipo' => 'frente',
            'capacidadM3' => (float) ($almacen->capacidad_referencial ?? 0),
            'radioGeocercaM' => (int) $almacen->radio_geocerca_m,
            'activo' => (bool) $almacen->activo,
            'coords' => $this->coords($almacen->latitud, $almacen->longitud, $indice),
        ])->all();
    }

    /**
     * @return array{lat: float, lng: float}
     */
    private function coords(?float $lat, ?float $lng, int $indice): array
    {
        if ($lat !== null && $lng !== null) {
            return ['lat' => $lat, 'lng' => $lng];
        }

        $radio = 0.012;
        $angulo = deg2rad(137.5 * $indice);

        return [
            'lat' => round(self::MANTARO_LAT + $radio * cos($angulo) * (1 + 0.35 * $indice), 5),
            'lng' => round(self::MANTARO_LNG + $radio * sin($angulo) * (1 + 0.6 * $indice), 5),
        ];
    }

    private function estadoObra(string $estado): string
    {
        return match ($estado) {
            'ejecucion' => 'en-ejecucion',
            'paralizada' => 'paralizada',
            'culminada', 'cerrada' => 'culminada',
            default => 'planificacion',
        };
    }

    /**
     * @return array<string, array<string, float>>
     */
    private function stockAnidado($stock): array
    {
        $anidado = [];

        foreach ($stock as $posicion) {
            $anidado[(string) $posicion->almacen_id][(string) $posicion->material_id] = (float) $posicion->cantidad;
        }

        return $anidado;
    }

    /**
     * @return array<int, array{lat: float, lng: float, peso: int}>
     */
    private function construirCalor($stock): array
    {
        $porAlmacen = [];

        foreach ($stock as $posicion) {
            if ((float) $posicion->cantidad <= (float) $posicion->stock_minimo) {
                $porAlmacen[$posicion->almacen_id] = ($porAlmacen[$posicion->almacen_id] ?? 0) + 1;
            }
        }

        return Almacen::query()
            ->whereIn('id', array_keys($porAlmacen))
            ->get()
            ->map(fn (Almacen $almacen): array => [
                'lat' => (float) $almacen->latitud,
                'lng' => (float) $almacen->longitud,
                'peso' => (int) ($porAlmacen[$almacen->id] ?? 0),
            ])
            ->values()
            ->all();
    }
}
