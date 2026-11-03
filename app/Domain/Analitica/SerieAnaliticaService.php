<?php

namespace App\Domain\Analitica;

use App\Models\AlertaAbastecimiento;
use App\Models\Kardex;
use App\Models\ParametroInventario;
use App\Models\PronosticoDemanda;
use App\Models\StockAlmacen;
use Illuminate\Support\Carbon;

/**
 * Serie agregada de demanda real y pronóstico para los gráficos del panel y
 * del módulo de Analítica. No recalcula modelos: lee lo persistido.
 */
class SerieAnaliticaService
{
    /**
     * @return array{
     *     serie: list<array{fecha: string, real: float|null, pronostico: float|null, inferior: float|null, superior: float|null}>,
     *     cobertura_dias: float|null,
     *     mape: float|null,
     *     quiebres_7d: int,
     *     alertas: int,
     *     demanda_media: float
     * }
     */
    public function resumen(int $diasHistoria = 30, int $diasPronostico = 30): array
    {
        $hoy = Carbon::today();
        $desde = $hoy->copy()->subDays($diasHistoria - 1);

        $reales = Kardex::query()
            ->whereIn('tipo_movimiento', SeriesDemandaService::TIPOS_DEMANDA)
            ->where('created_at', '>=', $desde->copy()->startOfDay())
            ->selectRaw('DATE(created_at) as fecha_dia, SUM(ABS(cantidad)) as cantidad')
            ->groupByRaw('DATE(created_at)')
            ->pluck('cantidad', 'fecha_dia');

        $pronosticos = PronosticoDemanda::query()
            ->whereDate('fecha', '>', $hoy->toDateString())
            ->whereDate('fecha', '<=', $hoy->copy()->addDays($diasPronostico)->toDateString())
            ->selectRaw('DATE(fecha) as fecha_dia, SUM(cantidad) as cantidad, SUM(limite_inferior) as inferior, SUM(limite_superior) as superior')
            ->groupByRaw('DATE(fecha)')
            ->get()
            ->keyBy(fn ($fila): string => Carbon::parse($fila->fecha_dia)->toDateString());

        $serie = [];

        for ($indice = 0; $indice < $diasHistoria; $indice++) {
            $fecha = $desde->copy()->addDays($indice)->toDateString();
            $serie[] = [
                'fecha' => $fecha,
                'real' => round((float) ($reales[$fecha] ?? 0.0), 3),
                'pronostico' => null,
                'inferior' => null,
                'superior' => null,
            ];
        }

        for ($indice = 1; $indice <= $diasPronostico; $indice++) {
            $fecha = $hoy->copy()->addDays($indice)->toDateString();
            $fila = $pronosticos->get($fecha);

            $serie[] = [
                'fecha' => $fecha,
                'real' => null,
                'pronostico' => $fila !== null ? round((float) $fila->cantidad, 3) : null,
                'inferior' => $fila !== null ? round((float) $fila->inferior, 3) : null,
                'superior' => $fila !== null ? round((float) $fila->superior, 3) : null,
            ];
        }

        $demandaMedia = (float) ParametroInventario::query()
            ->where('vigente', true)
            ->sum('demanda_media_diaria');
        $stockTotal = (float) StockAlmacen::query()->sum('cantidad');
        $mape = PronosticoDemanda::query()
            ->whereDate('fecha', '>', $hoy->toDateString())
            ->avg('mape');

        return [
            'serie' => $serie,
            'cobertura_dias' => $demandaMedia > 0
                ? round($stockTotal / $demandaMedia, 1)
                : null,
            'mape' => $mape !== null ? round((float) $mape, 2) : null,
            'quiebres_7d' => AlertaAbastecimiento::query()
                ->where('estado', 'vigente')
                ->where('tipo', 'quiebre_proyectado')
                ->whereDate('fecha_estimada', '<=', $hoy->copy()->addDays(7)->toDateString())
                ->count(),
            'alertas' => AlertaAbastecimiento::query()->where('estado', 'vigente')->count(),
            'demanda_media' => round($demandaMedia, 3),
        ];
    }
}
