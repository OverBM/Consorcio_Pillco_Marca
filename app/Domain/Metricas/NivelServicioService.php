<?php

namespace App\Domain\Metricas;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Nivel de servicio logístico compuesto.
 *
 * El valor principal es el cumplimiento de despacho; el resto de componentes
 * explica dónde está el problema. Cada componente puede ser `null` cuando no
 * existen datos suficientes, y la UI debe mostrar "sin datos".
 */
final class NivelServicioService
{
    /**
     * @return array{
     *     indice: float|null,
     *     componentes: array{
     *         cumplimiento: float|null,
     *         puntualidad: float|null,
     *         disponibilidad: float|null,
     *         precision: float|null
     *     },
     *     detalle: array{despachos: int, conDiferencia: int, conEta: int, puntuales: int, solicitudes: int, atendidas: int}
     * }
     */
    public function resumen(?int $obraId, ?int $almacenId, int $dias = 30): array
    {
        $desde = CarbonImmutable::now()->subDays($dias)->startOfDay();

        $despachos = $this->despachos($obraId, $almacenId, $desde);
        $cumplimiento = $despachos['confirmados'] > 0
            ? round((($despachos['confirmados'] - $despachos['conDiferencia']) / $despachos['confirmados']) * 100, 1)
            : null;

        $puntualidad = $despachos['conEta'] > 0
            ? round(($despachos['puntuales'] / $despachos['conEta']) * 100, 1)
            : null;

        [$solicitudes, $atendidas] = $this->solicitudes($obraId, $almacenId, $desde);
        $disponibilidad = $solicitudes > 0
            ? round(($atendidas / $solicitudes) * 100, 1)
            : null;

        $precision = $this->precisionInventario($almacenId, $desde);

        return [
            'indice' => $cumplimiento,
            'componentes' => [
                'cumplimiento' => $cumplimiento,
                'puntualidad' => $puntualidad,
                'disponibilidad' => $disponibilidad,
                'precision' => $precision,
            ],
            'detalle' => [
                'despachos' => $despachos['confirmados'],
                'conDiferencia' => $despachos['conDiferencia'],
                'conEta' => $despachos['conEta'],
                'puntuales' => $despachos['puntuales'],
                'solicitudes' => $solicitudes,
                'atendidas' => $atendidas,
            ],
        ];
    }

    /**
     * @return array{confirmados: int, conDiferencia: int, conEta: int, puntuales: int}
     */
    private function despachos(?int $obraId, ?int $almacenId, CarbonImmutable $desde): array
    {
        try {
            $filas = DB::table('despachos as d')
                ->join('transferencias as t', 't.id', '=', 'd.transferencia_id')
                ->join('almacenes as a', 'a.id', '=', 't.almacen_destino_id')
                ->leftJoin('confirmaciones_recepcion_destino as c', 'c.transferencia_id', '=', 't.id')
                ->where('d.despachado_en', '>=', $desde)
                ->when($almacenId !== null, fn ($q) => $q->where('t.almacen_destino_id', $almacenId))
                ->when($almacenId === null && $obraId !== null, fn ($q) => $q->where('a.obra_id', $obraId))
                ->get([
                    'c.hay_diferencias',
                    'c.recibida_en',
                    'd.despachado_en',
                    't.eta_min',
                ]);
        } catch (\Throwable) {
            return ['confirmados' => 0, 'conDiferencia' => 0, 'conEta' => 0, 'puntuales' => 0];
        }

        $confirmados = 0;
        $conDiferencia = 0;
        $conEta = 0;
        $puntuales = 0;

        foreach ($filas as $fila) {
            if ($fila->recibida_en === null) {
                continue;
            }

            $confirmados++;

            if ((bool) $fila->hay_diferencias) {
                $conDiferencia++;
            }

            if ($fila->eta_min === null) {
                continue;
            }

            $conEta++;
            $minutos = CarbonImmutable::parse($fila->despachado_en)
                ->diffInMinutes(CarbonImmutable::parse($fila->recibida_en), absolute: true);

            if ($minutos <= (float) $fila->eta_min) {
                $puntuales++;
            }
        }

        return [
            'confirmados' => $confirmados,
            'conDiferencia' => $conDiferencia,
            'conEta' => $conEta,
            'puntuales' => $puntuales,
        ];
    }

    /**
     * @return array{0: int, 1: int}
     */
    private function solicitudes(?int $obraId, ?int $almacenId, CarbonImmutable $desde): array
    {
        try {
            $query = DB::table('solicitudes_material as sm')
                ->join('almacenes as a', 'a.id', '=', 'sm.almacen_id')
                ->where('sm.created_at', '>=', $desde)
                ->when($almacenId !== null, fn ($q) => $q->where('sm.almacen_id', $almacenId))
                ->when($almacenId === null && $obraId !== null, fn ($q) => $q->where('a.obra_id', $obraId));

            $total = (int) (clone $query)->count();

            $atendidas = (int) (clone $query)
                ->whereIn('sm.estado', ['atendida', 'despachada', 'completada', 'cerrada'])
                ->count();

            return [$total, $atendidas];
        } catch (\Throwable) {
            return [0, 0];
        }
    }

    private function precisionInventario(?int $almacenId, CarbonImmutable $desde): ?float
    {
        try {
            $query = DB::table('inventario_fisico_detalles as d')
                ->join('inventarios_fisicos as i', 'i.id', '=', 'd.inventario_id')
                ->where('i.estado', 'cerrado')
                ->where('i.cerrado_en', '>=', $desde)
                ->when($almacenId !== null, fn ($q) => $q->where('i.almacen_id', $almacenId));

            $sistema = (float) (clone $query)->sum('d.cantidad_sistema');

            if ($sistema <= 0) {
                return null;
            }

            $diferencia = (float) (clone $query)
                ->sum(DB::raw('ABS(COALESCE(d.cantidad_reconteo, d.cantidad_contada) - d.cantidad_sistema)'));

            return round(max(0.0, 1 - ($diferencia / $sistema)) * 100, 1);
        } catch (\Throwable) {
            return null;
        }
    }
}
