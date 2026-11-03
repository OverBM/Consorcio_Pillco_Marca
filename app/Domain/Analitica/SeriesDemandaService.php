<?php

namespace App\Domain\Analitica;

use App\Models\Kardex;
use App\Models\Material;
use App\Models\MaterialProveedor;
use App\Models\StockAlmacen;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Construye las series de demanda diaria y el payload que consume el motor
 * predictivo. La demanda excluye ajustes, devoluciones y mermas.
 */
class SeriesDemandaService
{
    /**
     * Movimientos que representan consumo real de obra.
     *
     * @var list<string>
     */
    public const TIPOS_DEMANDA = [
        'salida_consumo',
        'salida_transferencia',
        'salida_despacho',
        'salida_epp',
    ];

    public const DIAS_MINIMOS_HISTORIA = 60;

    /**
     * Demanda diaria del par almacén-material, con ceros en los días sin movimiento.
     *
     * @return list<array{fecha: string, cantidad: float}>
     */
    public function demandaDiaria(int $almacenId, int $materialId, int $dias = 90): array
    {
        $desde = Carbon::today()->subDays($dias - 1);

        $movimientos = Kardex::query()
            ->where('almacen_id', $almacenId)
            ->where('material_id', $materialId)
            ->whereIn('tipo_movimiento', self::TIPOS_DEMANDA)
            ->where('created_at', '>=', $desde->copy()->startOfDay())
            ->selectRaw('DATE(created_at) as fecha, SUM(ABS(cantidad)) as cantidad')
            ->groupByRaw('DATE(created_at)')
            ->pluck('cantidad', 'fecha');

        $serie = [];

        for ($indice = 0; $indice < $dias; $indice++) {
            $fecha = $desde->copy()->addDays($indice)->toDateString();
            $serie[] = [
                'fecha' => $fecha,
                'cantidad' => round((float) ($movimientos[$fecha] ?? 0.0), 3),
            ];
        }

        return $serie;
    }

    /**
     * Días transcurridos desde el primer movimiento de demanda del par.
     */
    public function diasHistoria(int $almacenId, int $materialId): int
    {
        $primero = Kardex::query()
            ->where('almacen_id', $almacenId)
            ->where('material_id', $materialId)
            ->whereIn('tipo_movimiento', self::TIPOS_DEMANDA)
            ->min('created_at');

        if ($primero === null) {
            return 0;
        }

        return max((int) Carbon::parse($primero)->diffInDays(Carbon::today()), 0);
    }

    /**
     * Payload completo para `POST /v1/pipeline` del motor predictivo.
     *
     * @return array<string, mixed>
     */
    public function payloadSeries(
        int $dias = 90,
        ?int $obraId = null,
        ?int $almacenId = null,
        ?int $materialId = null,
    ): array {
        $stock = StockAlmacen::query()
            ->with(['almacen:id,obra_id', 'material:id,codigo,nombre,unidad_id,costo_referencial'])
            ->when($almacenId !== null, fn ($query) => $query->where('almacen_id', $almacenId))
            ->when($obraId !== null, fn ($query) => $query->whereHas(
                'almacen',
                fn ($subquery) => $subquery->where('obra_id', $obraId)
            ))
            ->when($materialId !== null, fn ($query) => $query->where('material_id', $materialId))
            ->whereHas('material', fn ($query) => $query->where('activo', true))
            ->get();

        $materiales = $stock->pluck('material')->filter()->unique('id')->values();
        $proveedores = $this->proveedoresPrincipales($materiales->pluck('id')->all());
        $unidades = Material::query()
            ->with('unidadMedida:id,codigo')
            ->whereIn('id', $materiales->pluck('id')->all())
            ->get()
            ->keyBy('id');

        $series = [];

        foreach ($stock as $posicion) {
            if ($posicion->material === null || $posicion->almacen === null) {
                continue;
            }

            $material = $unidades->get($posicion->material_id);
            $proveedor = $proveedores->get($posicion->material_id);
            $demanda = $this->demandaDiaria($posicion->almacen_id, $posicion->material_id, $dias);
            $historia = $this->diasHistoria($posicion->almacen_id, $posicion->material_id);

            $series[] = [
                'almacen_id' => $posicion->almacen_id,
                'material_id' => $posicion->material_id,
                'unidad' => $material?->unidadMedida?->codigo ?? 'UND',
                'fechas' => array_column($demanda, 'fecha'),
                'cantidades' => array_column($demanda, 'cantidad'),
                'stock_actual' => round((float) $posicion->cantidad - (float) $posicion->cantidad_reservada, 3),
                'stock_maximo' => $posicion->stock_maximo !== null ? (float) $posicion->stock_maximo : null,
                'lead_time_dias' => $proveedor !== null ? (float) $proveedor->lead_time_dias : null,
                'costo_pedido' => $proveedor !== null ? (float) $proveedor->costo_pedido : null,
                'precio_unitario' => $proveedor !== null
                    ? (float) $proveedor->precio_unitario
                    : (float) ($posicion->material->costo_referencial ?? 0),
                'dias_historia' => $historia,
                'datos_insuficientes' => $historia < self::DIAS_MINIMOS_HISTORIA,
            ];
        }

        return [
            'generado_en' => now()->toIso8601String(),
            'configuracion' => [
                'costo_mantenimiento_pct' => (float) $this->parametro('analitica.costo_mantenimiento_pct', '0.18'),
                'nivel_servicio' => (float) $this->parametro('analitica.nivel_servicio', '0.95'),
                'nivel_servicio_clase_a' => (float) $this->parametro('analitica.nivel_servicio_clase_a', '0.975'),
                'horizonte_dias' => (int) $this->parametro('analitica.horizonte_dias', '30'),
                'min_dias_historia' => (int) $this->parametro('analitica.min_dias_historia', '60'),
            ],
            'series' => $series,
        ];
    }

    /**
     * Deja el payload con el contrato exacto del motor Python.
     * `generado_en`, `dias_historia` y `datos_insuficientes` son metadatos
     * internos de Laravel y el contrato los rechaza con `extra="forbid"`.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function payloadParaMotor(array $payload): array
    {
        $campos = array_flip([
            'almacen_id', 'material_id', 'unidad', 'fechas', 'cantidades',
            'stock_actual', 'stock_maximo', 'lead_time_dias', 'costo_pedido',
            'precio_unitario', 'nivel_servicio',
        ]);

        return [
            'configuracion' => $payload['configuracion'],
            'series' => array_map(
                fn (array $serie): array => array_intersect_key($serie, $campos),
                $payload['series'],
            ),
        ];
    }

    /**
     * @param  list<int>  $materialIds
     * @return Collection<int, MaterialProveedor>
     */
    private function proveedoresPrincipales(array $materialIds): Collection
    {
        if ($materialIds === []) {
            return collect();
        }

        return MaterialProveedor::query()
            ->whereIn('material_id', $materialIds)
            ->where('activo', true)
            ->orderByDesc('es_principal')
            ->orderBy('lead_time_dias')
            ->get()
            ->unique('material_id')
            ->keyBy('material_id');
    }

    private function parametro(string $clave, string $porDefecto): string
    {
        $valor = DB::table('parametros_sistema')
            ->where('clave', $clave)
            ->value('valor');

        return $valor !== null ? (string) $valor : $porDefecto;
    }
}
