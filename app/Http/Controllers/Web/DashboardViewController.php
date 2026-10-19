<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Web\Concerns\FiltraContextoOperativo;
use App\Models\Almacen;
use App\Models\ExcedenteDetectado;
use App\Models\Kardex;
use App\Models\Material;
use App\Models\Merma;
use App\Models\Obra;
use App\Models\OrdenCompra;
use App\Models\ParametroSistema;
use App\Models\Requerimiento;
use App\Models\SolicitudMaterial;
use App\Models\StockAlmacen;
use App\Models\Transferencia;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardViewController extends Controller
{
    use FiltraContextoOperativo;

    private const MANTARO_LAT = -12.068;

    private const MANTARO_LNG = -75.21;

    public function panel(): Response
    {
        $obrasModel = $this->filtrarContextoObras(Obra::query())->get();
        $almacenesModel = $this->filtrarContextoAlmacenes(Almacen::query())->get();
        $stockModel = $this->filtrarContextoAlmacen(StockAlmacen::query())
            ->with(['almacen', 'material'])
            ->get();

        $obrasRedModel = Obra::query()->orderBy('id')->get();
        $almacenesRedModel = Almacen::query()->orderBy('id')->get();
        $stockRedModel = StockAlmacen::query()->with(['almacen', 'material'])->get();

        $minPorMaterial = $this->minimosPorMaterial($stockModel);
        [$disponiblePorAlmacen, $stockNested] = $this->disponibilidadPorAlmacen($stockModel);

        $minPorMaterialRed = $this->minimosPorMaterial($stockRedModel);
        [$disponibleRed, $stockRedNested] = $this->disponibilidadPorAlmacen($stockRedModel);

        $almacenCentralId = $this->resolverAlmacenCentralId($almacenesRedModel);

        $materiales = Material::with(['categoria', 'unidadMedida'])->get()->map(fn ($m) => [
            'id' => (string) $m->id,
            'codigo' => $m->codigo,
            'nombre' => $m->nombre,
            'categoria' => $m->categoria?->nombre ?? 'General',
            'unidad' => $m->unidadMedida?->codigo ?? 'und',
            'stockMinimo' => $minPorMaterialRed[$m->id] ?? $minPorMaterial[$m->id] ?? 50,
            'costoReferencial' => (float) ($m->costo_referencial ?? 30.0),
            'criticidad' => $m->criticidad ?? 'normal',
        ]);

        $stock = $this->filtrarContextoAlmacen(StockAlmacen::query())
            ->with(['almacen', 'material'])
            ->get()
            ->map(fn ($s) => [
                'id' => (string) $s->id,
                'almacenId' => (string) $s->almacen_id,
                'materialId' => (string) $s->material_id,
                'cantidad' => (float) $s->cantidad,
                'cantidadReservada' => (float) $s->cantidad_reservada,
                'disponible' => max(0, (float) $s->cantidad - (float) $s->cantidad_reservada),
                'stockMinimo' => (float) $s->stock_minimo,
                'stockSeguridad' => (float) $s->stock_seguridad,
                'puntoReorden' => (float) $s->punto_reorden,
            ]);

        return Inertia::render('PanelGeneral', [
            'obrasDb' => $this->mapearObras($obrasModel),
            'almacenesDb' => $this->mapearAlmacenes($almacenesModel),
            'obrasRedDb' => $this->mapearObras($obrasRedModel),
            'almacenesRedDb' => $this->mapearAlmacenes($almacenesRedModel),
            'materialesDb' => $materiales,
            'stockDb' => $stock,
            'stock' => $stockNested,
            'stockRed' => $stockRedNested,
            'almacenCentralId' => $almacenCentralId !== null ? (string) $almacenCentralId : null,
            'indicadores' => Inertia::defer(fn () => $this->construirIndicadores($stockModel, $obrasModel, $disponiblePorAlmacen)),
            'sobrantes' => Inertia::defer(fn () => $this->construirSobrantes($obrasRedModel, $almacenesRedModel, $disponibleRed, $minPorMaterialRed)),
            'rutas' => Inertia::defer(fn () => $this->construirRutas()),
            'movimientos7d' => Inertia::defer(fn () => $this->construirMovimientos7d()),
            'obraActivaId' => $this->obraActivaId(),
        ]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function mapearObras(Collection $obras): array
    {
        return $obras->values()->map(fn ($o, $i) => [
            'id' => (string) $o->id,
            'codigo' => $o->codigo ?? 'OBR-'.$o->id,
            'nombre' => $o->nombre,
            'distrito' => $o->distrito ?? 'Huancayo',
            'responsable' => 'Ing. Residente General',
            'estado' => $this->mapearEstadoObra($o->estado),
            'pctAvance' => (float) ($o->avance_fisico_pct ?? 65.0),
            'presupuesto' => (float) ($o->presupuesto_base ?? 1850000.0),
            'coords' => $this->coordsConDispersion($o->latitud, $o->longitud, $i),
            'descripcion' => $o->direccion ?? 'Frente de Obra Valle del Mantaro',
            'fechaInicio' => $o->fecha_inicio ? $o->fecha_inicio->format('Y-m-d') : '2026-01-15',
        ])->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function mapearAlmacenes(Collection $almacenes): array
    {
        return $almacenes->values()->map(fn ($a, $i) => [
            'id' => (string) $a->id,
            'obraId' => (string) $a->obra_id,
            'codigo' => $a->codigo ?? 'ALM-'.$a->id,
            'nombre' => $a->nombre,
            'tipo' => 'frente',
            'capacidadM3' => (float) ($a->capacidad_referencial ?? 5000),
            'radioGeocercaM' => (int) ($a->radio_geocerca_m ?? 150),
            'activo' => (bool) $a->activo,
            'coords' => $this->coordsConDispersion($a->latitud, $a->longitud, $i),
        ])->all();
    }

    /**
     * Coordenadas de un punto; cuando faltan, se genera una posición
     * determinista en espiral alrededor del Valle del Mantaro para evitar
     * que varios registros colapsen en un mismo punto del mapa.
     *
     * @return array{lat: float, lng: float}
     */
    private function coordsConDispersion(?float $lat, ?float $lng, int $indice): array
    {
        if ($lat !== null && $lng !== null) {
            return ['lat' => (float) $lat, 'lng' => (float) $lng];
        }

        $radio = 0.012;
        $angulo = deg2rad(137.5 * $indice);

        return [
            'lat' => round(self::MANTARO_LAT + $radio * cos($angulo) * (1 + 0.35 * $indice), 5),
            'lng' => round(self::MANTARO_LNG + $radio * sin($angulo) * (1 + 0.6 * $indice), 5),
        ];
    }

    /**
     * @return array<int|string, float>
     */
    private function minimosPorMaterial(Collection $stock): array
    {
        $minimos = [];
        foreach ($stock as $s) {
            $min = (float) $s->stock_minimo;
            if (! isset($minimos[$s->material_id]) || $min > $minimos[$s->material_id]) {
                $minimos[$s->material_id] = $min;
            }
        }

        return $minimos;
    }

    /**
     * @return array{0: array<int|string, array<int|string, float>>, 1: array{stock: array<string, array<string, float>>, reservas: array<string, mixed>}}
     */
    private function disponibilidadPorAlmacen(Collection $stock): array
    {
        $disponible = [];
        $nested = ['stock' => [], 'reservas' => []];

        foreach ($stock as $s) {
            $cantidad = max(0, (float) $s->cantidad - (float) $s->cantidad_reservada);
            $disponible[$s->almacen_id][$s->material_id] = $cantidad;
            $nested['stock'][(string) $s->almacen_id][(string) $s->material_id] = $cantidad;
        }

        return [$disponible, $nested];
    }

    /**
     * Resuelve el almacén central desde el parámetro configurado y, en su
     * defecto, desde el primer almacén de la red. Nunca usa un id fijo.
     */
    private function resolverAlmacenCentralId(Collection $almacenesRed): ?int
    {
        $configurado = ParametroSistema::query()
            ->where('clave', 'logistica.almacen_central_id')
            ->value('valor');

        if ($configurado !== null && $configurado !== '') {
            $almacen = $almacenesRed->firstWhere('id', (int) $configurado);
            if ($almacen !== null) {
                return (int) $almacen->id;
            }
        }

        $primero = $almacenesRed->first();

        return $primero !== null ? (int) $primero->id : null;
    }

    /**
     * @return array{solicitudes: int, requerimientosSobrecosto: int, ocFletes: int, stockCritico: int, transferencias: int, incidencias: int, mermas: int}
     */
    private function construirIndicadores(Collection $stockModel, Collection $obrasModel, array $disponiblePorAlmacen): array
    {
        $estadoPorObra = $obrasModel->mapWithKeys(fn ($o) => [$o->id => $this->mapearEstadoObra($o->estado)]);

        $stockCritico = 0;
        foreach ($stockModel as $s) {
            $obraEstado = $estadoPorObra[$s->almacen?->obra_id] ?? 'activa';
            if (in_array($obraEstado, ['cerrada', 'en-cierre'], true)) {
                continue;
            }
            $disponible = $disponiblePorAlmacen[$s->almacen_id][$s->material_id] ?? 0;
            if ($disponible < (float) $s->stock_minimo) {
                $stockCritico++;
            }
        }

        $solicitudes = $this->filtrarContexto(SolicitudMaterial::query())
            ->whereIn('estado', ['registrada'])
            ->count();

        $requerimientosSobrecosto = $this->filtrarContexto(Requerimiento::query())
            ->where('prioridad', 'urgente')
            ->count();

        $ocTransito = $this->filtrarContexto(OrdenCompra::query(), 'obra_id', 'almacen_destino_id')
            ->where('estado', 'en_transporte')
            ->count();

        $fletesRuta = DB::table('transportes')
            ->whereIn('estado', ['programado', 'en_ruta'])
            ->count();

        $transferencias = $this->filtrarContextoAlmacen(Transferencia::query(), 'almacen_origen_id', 'almacenOrigen')
            ->whereIn('estado', ['sugerida', 'solicitada', 'aprobada', 'en_transito'])
            ->count();

        $incidencias = $this->filtrarContextoAlmacen(Transferencia::query(), 'almacen_origen_id', 'almacenOrigen')
            ->where('estado', 'completada')
            ->whereHas('confirmacionRecepcion', fn ($q) => $q->where('hay_diferencias', true))
            ->count();

        $mermas = $this->filtrarContextoAlmacen(Merma::query())
            ->where('estado', 'registrada')
            ->count();

        return [
            'solicitudes' => $solicitudes,
            'requerimientosSobrecosto' => $requerimientosSobrecosto,
            'ocFletes' => $ocTransito + $fletesRuta,
            'stockCritico' => $stockCritico,
            'transferencias' => $transferencias,
            'incidencias' => $incidencias,
            'mermas' => $mermas,
        ];
    }

    /**
     * @param  array<int|string, array<int|string, float>>  $disponiblePorAlmacen
     * @param  array<int|string, float>  $minPorMaterial
     * @return array<int, array<string, mixed>>
     */
    private function construirSobrantes(Collection $obrasModel, Collection $almacenesModel, array $disponiblePorAlmacen, array $minPorMaterial): array
    {
        $obras = $obrasModel->keyBy('id');
        $almacenes = $almacenesModel->keyBy('id');

        return ExcedenteDetectado::query()
            ->with(['material', 'obra', 'almacen'])
            ->whereIn('estado', ['detectado', 'sugerido'])
            ->get()
            ->map(function ($exc) use ($obras, $almacenes, $disponiblePorAlmacen, $minPorMaterial) {
                $origen = $almacenes->get($exc->almacen_id);
                $min = $minPorMaterial[$exc->material_id] ?? 50;

                $receptoras = $almacenes
                    ->filter(function ($a) use ($exc, $origen, $obras, $disponiblePorAlmacen, $min) {
                        $obra = $obras->get($a->obra_id);

                        return $obra
                            && $this->mapearEstadoObra($obra->estado) === 'activa'
                            && (! $origen || $a->id !== $origen->id)
                            && ($disponiblePorAlmacen[$a->id][$exc->material_id] ?? 0) < $min;
                    })
                    ->map(fn ($a) => [
                        'almacenId' => (string) $a->id,
                        'obraId' => (string) $a->obra_id,
                        'nombreObra' => $obras->get($a->obra_id)?->nombre ?? '',
                        'distrito' => $obras->get($a->obra_id)?->distrito ?? '',
                        'km' => $origen ? $this->haversineKm(
                            (float) ($origen->latitud ?? -12.0652),
                            (float) ($origen->longitud ?? -75.2102),
                            (float) ($a->latitud ?? -12.0652),
                            (float) ($a->longitud ?? -75.2102),
                        ) : 0.0,
                    ])
                    ->sortBy('km')
                    ->take(3)
                    ->values()
                    ->all();

                $cantidad = (float) $exc->cantidad;

                return [
                    'id' => 'exc-'.$exc->id,
                    'tipo' => 'sobrante',
                    'materialId' => (string) $exc->material_id,
                    'almacenId' => (string) $exc->almacen_id,
                    'obraId' => (string) $exc->obra_origen_id,
                    'cantidad' => $cantidad,
                    'unidad' => $exc->material?->unidadMedida?->codigo ?? 'und',
                    'mensaje' => sprintf(
                        '%s: %s %s disponibles por cierre de %s.',
                        $exc->material?->nombre ?? 'Material',
                        $cantidad,
                        $exc->material?->unidadMedida?->codigo ?? 'und',
                        $exc->obra?->nombre ?? 'obra',
                    ),
                    'receptoras' => $receptoras,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return array<int, array{id: string, codigo: string, origenId: string, destinoId: string, estado: string}>
     */
    private function construirRutas(): array
    {
        return Transferencia::query()
            ->whereIn('estado', ['en_transito', 'aprobada'])
            ->get()
            ->map(fn ($t) => [
                'id' => (string) $t->id,
                'codigo' => $t->codigo,
                'origenId' => (string) $t->almacen_origen_id,
                'destinoId' => (string) $t->almacen_destino_id,
                'estado' => $t->estado === 'en_transito' ? 'en-transito' : 'pendiente',
            ])
            ->all();
    }

    /**
     * @return array<int, array{fecha: string, etiqueta: string, ingreso: float, salida: float}>
     */
    private function construirMovimientos7d(): array
    {
        $dias = ['Sun' => 'Dom', 'Mon' => 'Lun', 'Tue' => 'Mar', 'Wed' => 'Mié', 'Thu' => 'Jue', 'Fri' => 'Vie', 'Sat' => 'Sáb'];
        $inicio = CarbonImmutable::now()->subDays(6)->startOfDay();

        $buckets = [];
        for ($i = 0; $i < 7; $i++) {
            $dia = $inicio->addDays($i);
            $buckets[$dia->toDateString()] = [
                'fecha' => $dia->toDateString(),
                'etiqueta' => $dias[$dia->format('D')] ?? $dia->format('D'),
                'ingreso' => 0.0,
                'salida' => 0.0,
            ];
        }

        $this->filtrarContextoAlmacen(Kardex::query())
            ->where('created_at', '>=', $inicio)
            ->get(['cantidad', 'created_at'])
            ->each(function ($k) use (&$buckets) {
                $key = $k->created_at?->toDateString();
                if ($key === null || ! isset($buckets[$key])) {
                    return;
                }
                $cantidad = (float) $k->cantidad;
                if ($cantidad >= 0) {
                    $buckets[$key]['ingreso'] += $cantidad;
                } else {
                    $buckets[$key]['salida'] += abs($cantidad);
                }
            });

        return array_values($buckets);
    }

    private function mapearEstadoObra(?string $estado): string
    {
        return match ($estado) {
            'ejecucion', 'activa' => 'activa',
            'cierre', 'en-cierre', 'en_cierre' => 'en-cierre',
            'cerrada', 'liquidada' => 'cerrada',
            default => 'activa',
        };
    }

    private function haversineKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $radio = 6371.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $h = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return round(2 * $radio * asin(sqrt($h)), 2);
    }
}
