<?php

namespace App\Domain\Metricas;

use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Indicadores de inventario para el Panel General.
 *
 * Todas las consultas son de solo lectura y respetan el contexto operativo
 * (obra o almacén activo). Se hacen tres consultas base (stock, kardex y
 * transferencias) y el resto se calcula en PHP para minimizar round trips.
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

        $stock = $this->stockQuery($obraId, $almacenId)->get([
            's.almacen_id',
            's.material_id',
            's.cantidad',
            's.cantidad_reservada',
            's.stock_minimo',
            'm.costo_referencial',
            'a.nombre as almacen_nombre',
        ]);

        $movimientos = $this->kardexQuery($obraId, $almacenId)
            ->where('k.created_at', '>=', $desde)
            ->get([
                'k.almacen_id',
                'k.material_id',
                'k.cantidad',
                'k.costo_unitario',
                'k.created_at',
                'm.costo_referencial',
            ]);

        $transferencias = DB::table('transferencias as t')
            ->join('almacenes as a', 'a.id', '=', 't.almacen_destino_id')
            ->when($almacenId !== null, fn ($q) => $q->where('t.almacen_destino_id', $almacenId))
            ->when($almacenId === null && $obraId !== null, fn ($q) => $q->where('a.obra_id', $obraId))
            ->get(['t.estado', 't.created_at']);

        $valor = 0.0;
        $stockCritico = 0;
        $pares = [];
        $salud = [];

        foreach ($stock as $fila) {
            $cantidad = (float) $fila->cantidad;
            $reservada = (float) $fila->cantidad_reservada;
            $minimo = (float) $fila->stock_minimo;

            $valor += $cantidad * (float) ($fila->costo_referencial ?? 0);

            $critico = ($cantidad - $reservada) < $minimo;

            if ($critico) {
                $stockCritico++;
            }

            $clave = $fila->almacen_id.':'.$fila->material_id;
            $pares[$clave] = [
                'actual' => $cantidad,
                'reservada' => $reservada,
                'minimo' => $minimo,
                'movimientos' => array_fill(0, $dias, 0.0),
                'neto' => 0.0,
            ];

            $almacenFilaId = (int) $fila->almacen_id;

            if (! isset($salud[$almacenFilaId])) {
                $salud[$almacenFilaId] = [
                    'almacenId' => $almacenFilaId,
                    'nombre' => (string) $fila->almacen_nombre,
                    'criticos' => 0,
                    'total' => 0,
                ];
            }

            $salud[$almacenFilaId]['total']++;
            if ($critico) {
                $salud[$almacenFilaId]['criticos']++;
            }
        }

        $neto = 0.0;
        $buckets = [];

        for ($i = 0; $i < $dias; $i++) {
            $dia = $desde->addDays($i);
            $buckets[$dia->toDateString()] = [
                'fecha' => $dia->toDateString(),
                'ingreso' => 0.0,
                'salida' => 0.0,
            ];
        }

        foreach ($movimientos as $fila) {
            $cantidad = (float) $fila->cantidad;
            $costo = (float) ($fila->costo_unitario ?? $fila->costo_referencial ?? 0);
            $neto += $cantidad * $costo;

            $fecha = CarbonImmutable::parse($fila->created_at);
            $claveDia = $fecha->toDateString();

            if (isset($buckets[$claveDia])) {
                if ($cantidad >= 0) {
                    $buckets[$claveDia]['ingreso'] += $cantidad;
                } else {
                    $buckets[$claveDia]['salida'] += abs($cantidad);
                }
            }

            $clave = $fila->almacen_id.':'.$fila->material_id;

            if (! isset($pares[$clave])) {
                continue;
            }

            $indice = (int) $fecha->diffInDays($desde);
            $indice = max(0, min($dias - 1, $indice));
            $pares[$clave]['movimientos'][$indice] += $cantidad;
            $pares[$clave]['neto'] += $cantidad;
        }

        $serieCriticos = array_fill(0, $dias, 0);

        foreach ($pares as &$par) {
            $par['stock'] = $par['actual'] - $par['neto'];
        }
        unset($par);

        for ($dia = 0; $dia < $dias; $dia++) {
            foreach ($pares as &$par) {
                $par['stock'] += $par['movimientos'][$dia];

                if ($par['minimo'] > $par['stock'] - $par['reservada']) {
                    $serieCriticos[$dia]++;
                }
            }
            unset($par);
        }

        $transito = 0;
        $serieTransferencias = array_fill(0, $dias, 0);

        foreach ($transferencias as $fila) {
            if (in_array($fila->estado, ['sugerida', 'solicitada', 'aprobada', 'en_transito'], true)) {
                $transito++;
            }

            $fecha = CarbonImmutable::parse($fila->created_at);

            if ($fecha->lt($desde)) {
                continue;
            }

            $indice = (int) $fecha->diffInDays($desde);
            $indice = max(0, min($dias - 1, $indice));
            $serieTransferencias[$indice]++;
        }

        $salud = array_values(array_map(function (array $fila): array {
            $total = (int) $fila['total'];
            $criticos = (int) $fila['criticos'];

            return [
                'almacenId' => $fila['almacenId'],
                'nombre' => $fila['nombre'],
                'criticos' => $criticos,
                'total' => $total,
                'pctCritico' => $total > 0 ? round(($criticos / $total) * 100, 1) : 0.0,
            ];
        }, $salud));

        usort($salud, fn (array $a, array $b): int => $b['pctCritico'] <=> $a['pctCritico']);

        $valorAnterior = $valor - $neto;
        $variacionPct = $valorAnterior > 0
            ? round((($valor - $valorAnterior) / $valorAnterior) * 100, 1)
            : null;

        return [
            'valor' => round($valor, 2),
            'valorAnterior' => round($valorAnterior, 2),
            'variacionPct' => $variacionPct,
            'stockCritico' => $stockCritico,
            'skusTotales' => $stock->count(),
            'transferenciasTransito' => $transito,
            'serie30d' => array_values($buckets),
            'serieCriticos30d' => $serieCriticos,
            'serieTransferencias30d' => $serieTransferencias,
            'saludAlmacenes' => $salud,
        ];
    }

    /**
     * @return Builder
     */
    private function stockQuery(?int $obraId, ?int $almacenId)
    {
        return ConsultasInventario::stockQuery($almacenId, $obraId);
    }

    /**
     * @return Builder
     */
    private function kardexQuery(?int $obraId, ?int $almacenId)
    {
        return ConsultasInventario::kardexQuery($almacenId, $obraId);
    }
}
