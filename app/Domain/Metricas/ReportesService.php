<?php

namespace App\Domain\Metricas;

use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Indicadores de negocio para el módulo de reportes.
 *
 * Todas las consultas son de solo lectura y se alimentan de los registros
 * reales de stock, kardex, mermas, transferencias y órdenes de compra. Los
 * filtros de fecha, obra, almacén y categoría se aplican en SQL; las series
 * se agrupan en PHP para mantener compatibilidad entre PostgreSQL y SQLite.
 */
final class ReportesService
{
    /**
     * @param  array{desde: string, hasta: string, obra_id: int|null, almacen_id: int|null, categoria_id: int|null}  $filtros
     * @return array<string, mixed>
     */
    public function resumen(array $filtros): array
    {
        $desde = CarbonImmutable::parse($filtros['desde'])->startOfDay();
        $hasta = CarbonImmutable::parse($filtros['hasta'])->endOfDay();

        $stock = $this->stockQuery($filtros)->get([
            's.almacen_id',
            's.material_id',
            's.cantidad',
            's.cantidad_reservada',
            's.stock_minimo',
            'm.nombre as material',
            'm.codigo as codigo',
            'm.costo_referencial',
            'c.nombre as categoria',
            'a.nombre as almacen',
            'a.obra_id',
        ]);

        $valorInventario = 0.0;
        $stockCritico = 0;
        $unidades = 0.0;

        foreach ($stock as $fila) {
            $cantidad = (float) $fila->cantidad;
            $valorInventario += $cantidad * (float) ($fila->costo_referencial ?? 0);
            $unidades += $cantidad;

            if ((float) $fila->cantidad - (float) $fila->cantidad_reservada < (float) $fila->stock_minimo) {
                $stockCritico++;
            }
        }

        $kardex = $this->kardexQuery($filtros)
            ->whereBetween('k.created_at', [$desde, $hasta])
            ->get(['k.cantidad', 'k.costo_unitario', 'k.created_at']);

        $ingresos = 0.0;
        $salidas = 0.0;
        $movimientos = 0;

        foreach ($kardex as $fila) {
            $cantidad = (float) $fila->cantidad;
            $movimientos++;

            if ($cantidad >= 0) {
                $ingresos += $cantidad;
            } else {
                $salidas += abs($cantidad);
            }
        }

        $mermasQuery = $this->mermasQuery($filtros)
            ->whereBetween('me.created_at', [$desde, $hasta]);

        $mermasCantidad = (float) (clone $mermasQuery)->sum('me.cantidad');
        $mermasRegistros = (int) (clone $mermasQuery)->count();
        $mermasValor = (float) (clone $mermasQuery)
            ->join('materiales as mm', 'mm.id', '=', 'me.material_id')
            ->sum(DB::raw('me.cantidad * COALESCE(mm.costo_referencial, 0)'));

        $transferencias = $this->transferenciasQuery($filtros)
            ->whereBetween('t.created_at', [$desde, $hasta])
            ->get(['t.estado']);

        $totalTransferencias = $transferencias->count();
        $completadas = $transferencias->whereIn('estado', ['completada', 'recibida', 'cerrada'])->count();
        $cumplimiento = $totalTransferencias > 0
            ? round(($completadas / $totalTransferencias) * 100, 1)
            : null;

        $compras = (float) $this->comprasQuery($filtros)
            ->whereBetween('oc.created_at', [$desde, $hasta])
            ->sum('oc.total');

        $rotacion = $valorInventario > 0
            ? round(($salidas / max(1.0, $unidades)) * ($this->dias($desde, $hasta) / 30), 2)
            : null;

        return [
            'filtros' => [
                'desde' => $desde->toDateString(),
                'hasta' => $hasta->toDateString(),
                'obra_id' => $filtros['obra_id'],
                'almacen_id' => $filtros['almacen_id'],
                'categoria_id' => $filtros['categoria_id'],
            ],
            'indicadores' => [
                'valor_inventario' => round($valorInventario, 2),
                'stock_critico' => $stockCritico,
                'skus' => $stock->count(),
                'unidades' => round($unidades, 2),
                'mermas_registros' => $mermasRegistros,
                'mermas_cantidad' => round($mermasCantidad, 2),
                'mermas_valor' => round($mermasValor, 2),
                'ingresos' => round($ingresos, 2),
                'salidas' => round($salidas, 2),
                'movimientos' => $movimientos,
                'rotacion' => $rotacion,
                'cumplimiento' => $cumplimiento,
                'transferencias' => $totalTransferencias,
                'compras' => round($compras, 2),
                'obras_activas' => (int) $this->obrasActivas($filtros),
                'avance_promedio' => $this->avancePromedio($filtros),
            ],
            'serie' => $this->serieDiaria($filtros, $desde, $hasta),
            'categorias' => $this->porCategoria($filtros),
            'materiales' => $this->topMateriales($filtros, $desde, $hasta),
            'generado_en' => CarbonImmutable::now()->toIso8601String(),
        ];
    }

    private function stockQuery(array $filtros): Builder
    {
        return ConsultasInventario::stockQuery(
            $filtros['almacen_id'],
            $filtros['obra_id'],
            $filtros['categoria_id'],
        );
    }

    private function kardexQuery(array $filtros): Builder
    {
        return ConsultasInventario::kardexQuery(
            $filtros['almacen_id'],
            $filtros['obra_id'],
            $filtros['categoria_id'],
        );
    }

    private function mermasQuery(array $filtros): Builder
    {
        return DB::table('mermas as me')
            ->join('almacenes as a', 'a.id', '=', 'me.almacen_id')
            ->join('materiales as m', 'm.id', '=', 'me.material_id')
            ->when($filtros['almacen_id'] !== null, fn ($q) => $q->where('me.almacen_id', $filtros['almacen_id']))
            ->when($filtros['almacen_id'] === null && $filtros['obra_id'] !== null, fn ($q) => $q->where('a.obra_id', $filtros['obra_id']))
            ->when($filtros['categoria_id'] !== null, fn ($q) => $q->where('m.categoria_id', $filtros['categoria_id']));
    }

    private function transferenciasQuery(array $filtros): Builder
    {
        return DB::table('transferencias as t')
            ->join('almacenes as a', 'a.id', '=', 't.almacen_destino_id')
            ->when($filtros['almacen_id'] !== null, fn ($q) => $q->where('t.almacen_destino_id', $filtros['almacen_id']))
            ->when($filtros['almacen_id'] === null && $filtros['obra_id'] !== null, fn ($q) => $q->where('a.obra_id', $filtros['obra_id']));
    }

    private function comprasQuery(array $filtros): Builder
    {
        return DB::table('ordenes_compra as oc')
            ->when($filtros['almacen_id'] !== null, fn ($q) => $q->where('oc.almacen_destino_id', $filtros['almacen_id']))
            ->when($filtros['almacen_id'] === null && $filtros['obra_id'] !== null, fn ($q) => $q->where('oc.obra_id', $filtros['obra_id']));
    }

    private function obrasActivas(array $filtros): int
    {
        $query = DB::table('obras')
            ->whereIn('estado', ['ejecucion', 'activa', 'en_ejecucion']);

        if ($filtros['obra_id'] !== null) {
            $query->where('id', $filtros['obra_id']);
        }

        return (int) $query->count();
    }

    private function avancePromedio(array $filtros): ?float
    {
        $query = DB::table('obras')
            ->whereIn('estado', ['ejecucion', 'activa', 'en_ejecucion'])
            ->when($filtros['obra_id'] !== null, fn ($q) => $q->where('id', $filtros['obra_id']));

        $promedio = $query->avg('avance_fisico_pct');

        return $promedio !== null ? round((float) $promedio, 1) : null;
    }

    /**
     * @return list<array{fecha: string, etiqueta: string, ingreso: float, salida: float}>
     */
    private function serieDiaria(array $filtros, CarbonImmutable $desde, CarbonImmutable $hasta): array
    {
        $dias = (int) $desde->diffInDays($hasta) + 1;
        $dias = max(1, min($dias, 90));
        $inicio = $hasta->subDays($dias - 1)->startOfDay();

        $buckets = [];

        for ($i = 0; $i < $dias; $i++) {
            $dia = $inicio->addDays($i);
            $buckets[$dia->toDateString()] = [
                'fecha' => $dia->toDateString(),
                'etiqueta' => $dia->locale('es')->isoFormat('D MMM'),
                'ingreso' => 0.0,
                'salida' => 0.0,
            ];
        }

        try {
            $filas = $this->kardexQuery($filtros)
                ->whereBetween('k.created_at', [$inicio, $hasta])
                ->get(['k.cantidad', 'k.created_at']);

            foreach ($filas as $fila) {
                $clave = CarbonImmutable::parse($fila->created_at)->toDateString();

                if (! isset($buckets[$clave])) {
                    continue;
                }

                $cantidad = (float) $fila->cantidad;

                if ($cantidad >= 0) {
                    $buckets[$clave]['ingreso'] += $cantidad;
                } else {
                    $buckets[$clave]['salida'] += abs($cantidad);
                }
            }
        } catch (\Throwable) {
            // Serie vacía si el kardex no está disponible.
        }

        return array_values($buckets);
    }

    /**
     * @return list<array{categoria: string, valor: float, skus: int}>
     */
    private function porCategoria(array $filtros): array
    {
        try {
            return $this->stockQuery($filtros)
                ->selectRaw("COALESCE(c.nombre, 'Sin categoría') as categoria")
                ->selectRaw('SUM(s.cantidad * COALESCE(m.costo_referencial, 0)) as valor')
                ->selectRaw('COUNT(*) as skus')
                ->groupByRaw("COALESCE(c.nombre, 'Sin categoría')")
                ->orderByDesc('valor')
                ->get()
                ->map(fn ($fila): array => [
                    'categoria' => (string) $fila->categoria,
                    'valor' => round((float) $fila->valor, 2),
                    'skus' => (int) $fila->skus,
                ])
                ->values()
                ->all();
        } catch (\Throwable) {
            return [];
        }
    }

    /**
     * @return list<array{id: string, material: string, codigo: string, almacen: string, movimientos: float, salidas: float, stock: float, valor: float}>
     */
    private function topMateriales(array $filtros, CarbonImmutable $desde, CarbonImmutable $hasta): array
    {
        try {
            return $this->kardexQuery($filtros)
                ->whereBetween('k.created_at', [$desde, $hasta])
                ->selectRaw('m.id as material_id, m.nombre as material, m.codigo as codigo')
                ->selectRaw('a.nombre as almacen')
                ->selectRaw('SUM(ABS(k.cantidad)) as movimientos')
                ->selectRaw('SUM(CASE WHEN k.cantidad < 0 THEN ABS(k.cantidad) ELSE 0 END) as salidas')
                ->selectRaw('SUM(k.cantidad) as neto')
                ->groupBy('m.id', 'm.nombre', 'm.codigo', 'a.nombre')
                ->orderByDesc('movimientos')
                ->limit(10)
                ->get()
                ->map(function ($fila): array {
                    $stock = (float) DB::table('stock_almacen')
                        ->where('material_id', $fila->material_id)
                        ->sum('cantidad');

                    return [
                        'id' => (string) $fila->material_id.'-'.$fila->almacen,
                        'material' => (string) $fila->material,
                        'codigo' => (string) $fila->codigo,
                        'almacen' => (string) $fila->almacen,
                        'movimientos' => round((float) $fila->movimientos, 2),
                        'salidas' => round((float) $fila->salidas, 2),
                        'stock' => round($stock, 2),
                        'valor' => 0.0,
                    ];
                })
                ->values()
                ->all();
        } catch (\Throwable) {
            return [];
        }
    }

    private function dias(CarbonImmutable $desde, CarbonImmutable $hasta): int
    {
        return max(1, (int) $desde->diffInDays($hasta) + 1);
    }
}
