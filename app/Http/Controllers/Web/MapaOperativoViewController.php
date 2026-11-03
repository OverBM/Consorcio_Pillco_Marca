<?php

namespace App\Http\Controllers\Web;

use App\Domain\Analitica\RedistribucionAnaliticaService;
use App\Domain\Geo\Dto\Coordenada;
use App\Domain\Geo\ResumenCuotaRuteo;
use App\Domain\Geo\RuteoService;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Web\Concerns\FiltraContextoOperativo;
use App\Models\AlertaGeoespacial;
use App\Models\Almacen;
use App\Models\Despacho;
use App\Models\DespachoPosicion;
use App\Models\Material;
use App\Models\Obra;
use App\Models\StockAlmacen;
use App\Models\Transferencia;
use Inertia\Inertia;
use Inertia\Response;

class MapaOperativoViewController extends Controller
{
    use FiltraContextoOperativo;

    public function __construct(
        private readonly RuteoService $ruteo,
        private readonly ResumenCuotaRuteo $cuotaRuteo,
        private readonly RedistribucionAnaliticaService $redistribucion,
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

        $despachos = Despacho::query()
            ->with([
                'transferencia:id,codigo,almacen_origen_id,almacen_destino_id,estado,eta_min,distancia_m',
                'transferencia.almacenDestino:id,latitud,longitud,nombre',
                'posiciones' => fn ($query) => $query->latest('capturada_en')->limit(1),
            ])
            ->whereHas('transferencia', fn ($query) => $query->where('estado', 'en_transito'))
            ->get();

        $transferencias = Transferencia::query()
            ->with([
                'despacho:id,transferencia_id',
                'almacenOrigen:id,nombre,ubicacion',
                'almacenDestino:id,nombre,ubicacion',
            ])
            ->whereIn('estado', ['sugerida', 'solicitada', 'aprobada', 'en_transito'])
            ->limit(20)
            ->get(['id', 'codigo', 'almacen_origen_id', 'almacen_destino_id', 'estado', 'eta_min']);

        $posicionesPorTransferencia = $despachos
            ->mapWithKeys(fn (Despacho $despacho): array => [
                $despacho->transferencia_id => $despacho->posiciones->first(),
            ]);

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
            ))->values(),
            'sugerenciasDb' => $this->redistribucion->sugerencias(null, null, 6),
            'despachosDb' => $despachos->map(fn (Despacho $despacho): array => [
                'id' => $despacho->id,
                'codigo' => $despacho->transferencia?->codigo,
                'transferenciaId' => $despacho->transferencia_id,
                'etaMin' => $despacho->transferencia?->eta_min,
                'etaRestanteMin' => $this->etaDesdePosicion(
                    $despacho->posiciones->first(),
                    $despacho->transferencia?->almacenDestino,
                ),
                'distanciaM' => $despacho->transferencia?->distancia_m,
                'ultimaPosicion' => $despacho->posiciones->first()?->only([
                    'latitud', 'longitud', 'velocidad_kmh', 'capturada_en',
                ]),
            ])->values(),
            'alertasGeoDb' => AlertaGeoespacial::query()
                ->with('despacho.transferencia:id,codigo')
                ->where('estado', 'vigente')
                ->latest('id')
                ->limit(30)
                ->get(),
            'calorDb' => $this->construirCalor($stock),
            'cuotaRuteo' => $this->cuotaRuteo->hoy(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function mapearRuta(Transferencia $transferencia, ?DespachoPosicion $posicion): array
    {
        $destino = $transferencia->almacenDestino;
        $etaRestante = null;
        $distanciaRestante = null;
        $geometriaRestante = [];

        if ($posicion !== null && $destino !== null
            && $destino->latitud !== null && $destino->longitud !== null) {
            $ruta = $this->ruteo->calcular(
                new Coordenada((float) $posicion->latitud, (float) $posicion->longitud),
                new Coordenada((float) $destino->latitud, (float) $destino->longitud),
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
            'etaMin' => $transferencia->eta_min !== null ? (float) $transferencia->eta_min : null,
            'etaRestanteMin' => $etaRestante,
            'distanciaRestanteM' => $distanciaRestante,
            'despachoId' => $transferencia->despacho?->id,
            'posicionActual' => $posicion !== null ? [
                'lat' => (float) $posicion->latitud,
                'lng' => (float) $posicion->longitud,
                'velocidadKmh' => $posicion->velocidad_kmh !== null ? (float) $posicion->velocidad_kmh : null,
                'capturadaEn' => $posicion->capturada_en,
            ] : null,
            'geometria' => $this->geometriaRuta($transferencia),
            'geometriaRestante' => $geometriaRestante,
        ];
    }

    private function etaDesdePosicion(?DespachoPosicion $posicion, ?Almacen $destino): ?float
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
     * Geometría real de la ruta entre almacenes. Usa el servicio de ruteo
     * (ORS con fallback Haversine) y devuelve la lista de puntos.
     *
     * @return array<int, array{lat: float, lng: float}>
     */
    private function geometriaRuta(Transferencia $transferencia): array
    {
        $origen = $transferencia->almacenOrigen;
        $destino = $transferencia->almacenDestino;

        if ($origen === null || $destino === null
            || $origen->latitud === null || $origen->longitud === null
            || $destino->latitud === null || $destino->longitud === null) {
            return [];
        }

        return $this->ruteo->calcular(
            new Coordenada((float) $origen->latitud, (float) $origen->longitud),
            new Coordenada((float) $destino->latitud, (float) $destino->longitud),
        )->geometria;
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
