<?php

namespace App\Domain\Metricas;

use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Indicadores de inventario para el Panel General.
 *
 * Todas las consultas son de solo lectura y respetan el contexto operativo
 * (obra o almacén activo). Los cálculos se hacen en SQL salvo la serie diaria,
 * que se agrupa en PHP para mantener compatibilidad entre PostgreSQL y SQLite.
 */
final class MetricasInventarioService
{
    /**
     * @return array{
     *     valor: float,
     *     valorAnterior: float|null,
     *     variacionPct: float|null,
     *     stockCritico: int,
     *     skusTotales: int,
     *     transferenciasTransito: int,
     *     serie30d: list<array{fecha: string, ingreso: float, salida: float}>,
     *     serieCriticos30d: list<int>,
     *     serieTransferencias30d: list<int>,
     *     saludAlmacenes: list<array{almacenId: int, nombre: string, criticos: int, total: int, pctCritico: float}>
     * }
     */
    public function resumen(?int $obraId, ?int $almacenId, int $dias = 30): array
    {
        $desde = CarbonImmutable::now()->subDays($dias - 1)->startOfDay();

        $valor = (float) $this->stockQuery($obraId, $almacenId)
            ->sum(DB::raw('s.cantidad * COALESCE(m.costo_referencial, 0)'));

        $skusTotales = (int) $this->stockQuery($obraId, $almacenId)->count();

        $stockCritico = (int) $this->stockQuery($obraId, $almacenId)
            ->whereRaw('(s.cantidad - s.cantidad_reservada) < s.stock_minimo')
            ->count();

        $neto = (float) $this->kardexQuery($obraId, $almacenId)
            ->where('k.created_at', '>=', $desde)
            ->sum(DB::raw('k.cantidad * COALESCE(k.costo_unitario, m.costo_referencial, 0)'));

        $valorAnterior = $valor - $neto;
        $variacionPct = $valorAnterior > 0
            ? round((($valor - $valorAnterior) / $valorAnterior) * 100, 1)
            : null;

        return [
            'valor' => round($valor, 2),
            'valorAnterior' => round($valorAnterior, 2),
            'variacionPct' => $variacionPct,
            'stockCritico' => $stockCritico,
            'skusTotales' => $skusTotales,
            'transferenciasTransito' => $this->transferenciasEnTransito($obraId, $almacenId),
            'serie30d' => $this->serieDiaria($obraId, $almacenId, $desde),
            'serieCriticos30d' => $this->serieCriticos($obraId, $almacenId, $desde),
            'serieTransferencias30d' => $this->serieTransferencias($obraId, $almacenId, $desde),
            'saludAlmacenes' => $this->saludPorAlmacen($obraId, $almacenId),
        ];
    }

    /**
     * @return Builder
     */
    private function stockQuery(?int $obraId, ?int $almacenId)
    {
        return DB::table('stock_almacen as s')
            ->join('materiales as m', 'm.id', '=', 's.material_id')
            ->join('almacenes as a', 'a.id', '=', 's.almacen_id')
            ->when($almacenId !== null, fn ($q) => $q->where('s.almacen_id', $almacenId))
            ->when($almacenId === null && $obraId !== null, fn ($q) => $q->where('a.obra_id', $obraId));
    }

    /**
     * @return Builder
     */
    private function kardexQuery(?int $obraId, ?int $almacenId)
    {
        return DB::table('kardex as k')
            ->join('materiales as m', 'm.id', '=', 'k.material_id')
            ->join('almacenes as a', 'a.id', '=', 'k.almacen_id')
            ->when($almacenId !== null, fn ($q) => $q->where('k.almacen_id', $almacenId))
            ->when($almacenId === null && $obraId !== null, fn ($q) => $q->where('a.obra_id', $obraId));
    }

    private function transferenciasEnTransito(?int $obraId, ?int $almacenId): int
    {
        try {
            return (int) DB::table('transferencias as t')
                ->join('almacenes as a', 'a.id', '=', 't.almacen_destino_id')
                ->whereIn('t.estado', ['sugerida', 'solicitada', 'aprobada', 'en_transito'])
                ->when($almacenId !== null, fn ($q) => $q->where('t.almacen_destino_id', $almacenId))
                ->when($almacenId === null && $obraId !== null, fn ($q) => $q->where('a.obra_id', $obraId))
                ->count();
        } catch (\Throwable) {
            return 0;
        }
    }

    /**
     * @return list<array{fecha: string, ingreso: float, salida: float}>
     */
    private function serieDiaria(?int $obraId, ?int $almacenId, CarbonImmutable $desde): array
    {
        $buckets = [];

        for ($i = 0; $i < 30; $i++) {
            $dia = $desde->addDays($i);
            $buckets[$dia->toDateString()] = [
                'fecha' => $dia->toDateString(),
                'ingreso' => 0.0,
                'salida' => 0.0,
            ];
        }

        try {
            $filas = $this->kardexQuery($obraId, $almacenId)
                ->where('k.created_at', '>=', $desde)
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
     * Reconstruye, hacia atrás desde el stock actual, cuántos SKUs estuvieron
     * bajo el mínimo en cada uno de los últimos 30 días.
     *
     * @return list<int>
     */
    private function serieCriticos(?int $obraId, ?int $almacenId, CarbonImmutable $desde): array
    {
        $dias = 30;
        $conteo = array_fill(0, $dias, 0);

        try {
            $stock = $this->stockQuery($obraId, $almacenId)->get([
                's.almacen_id',
                's.material_id',
                's.cantidad',
                's.cantidad_reservada',
                's.stock_minimo',
            ]);

            $movimientos = $this->kardexQuery($obraId, $almacenId)
                ->where('k.created_at', '>=', $desde)
                ->get(['k.almacen_id', 'k.material_id', 'k.cantidad', 'k.created_at']);

            $pares = [];

            foreach ($stock as $fila) {
                $clave = $fila->almacen_id.':'.$fila->material_id;
                $pares[$clave] = [
                    'actual' => (float) $fila->cantidad,
                    'reservada' => (float) $fila->cantidad_reservada,
                    'minimo' => (float) $fila->stock_minimo,
                    'movimientos' => array_fill(0, $dias, 0.0),
                    'neto' => 0.0,
                ];
            }

            foreach ($movimientos as $fila) {
                $clave = $fila->almacen_id.':'.$fila->material_id;

                if (! isset($pares[$clave])) {
                    continue;
                }

                $indice = (int) CarbonImmutable::parse($fila->created_at)->diffInDays($desde);
                $indice = max(0, min($dias - 1, $indice));
                $cantidad = (float) $fila->cantidad;

                $pares[$clave]['movimientos'][$indice] += $cantidad;
                $pares[$clave]['neto'] += $cantidad;
            }

            foreach ($pares as &$par) {
                $par['stock'] = $par['actual'] - $par['neto'];
            }
            unset($par);

            for ($dia = 0; $dia < $dias; $dia++) {
                foreach ($pares as &$par) {
                    $par['stock'] += $par['movimientos'][$dia];

                    if ($par['minimo'] > $par['stock'] - $par['reservada']) {
                        $conteo[$dia]++;
                    }
                }
                unset($par);
            }
        } catch (\Throwable) {
            return $conteo;
        }

        return $conteo;
    }

    /**
     * @return list<int>
     */
    private function serieTransferencias(?int $obraId, ?int $almacenId, CarbonImmutable $desde): array
    {
        $dias = 30;
        $conteo = array_fill(0, $dias, 0);

        try {
            $filas = DB::table('transferencias as t')
                ->join('almacenes as a', 'a.id', '=', 't.almacen_destino_id')
                ->where('t.created_at', '>=', $desde)
                ->when($almacenId !== null, fn ($q) => $q->where('t.almacen_destino_id', $almacenId))
                ->when($almacenId === null && $obraId !== null, fn ($q) => $q->where('a.obra_id', $obraId))
                ->get(['t.created_at']);

            foreach ($filas as $fila) {
                $indice = (int) CarbonImmutable::parse($fila->created_at)->diffInDays($desde);
                $indice = max(0, min($dias - 1, $indice));
                $conteo[$indice]++;
            }
        } catch (\Throwable) {
            return $conteo;
        }

        return $conteo;
    }

    /**
     * @return list<array{almacenId: int, nombre: string, criticos: int, total: int, pctCritico: float}>
     */
    private function saludPorAlmacen(?int $obraId, ?int $almacenId): array
    {
        try {
            $filas = $this->stockQuery($obraId, $almacenId)
                ->selectRaw('a.id as almacen_id, a.nombre as nombre, COUNT(*) as total')
                ->selectRaw('SUM(CASE WHEN (s.cantidad - s.cantidad_reservada) < s.stock_minimo THEN 1 ELSE 0 END) as criticos')
                ->groupBy('a.id', 'a.nombre')
                ->get();
        } catch (\Throwable) {
            return [];
        }

        return array_values($filas->map(function ($fila): array {
            $total = (int) $fila->total;
            $criticos = (int) $fila->criticos;

            return [
                'almacenId' => (int) $fila->almacen_id,
                'nombre' => (string) $fila->nombre,
                'criticos' => $criticos,
                'total' => $total,
                'pctCritico' => $total > 0 ? round(($criticos / $total) * 100, 1) : 0.0,
            ];
        })->sortByDesc('pctCritico')->values()->all());
    }
}
