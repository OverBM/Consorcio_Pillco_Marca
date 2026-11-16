<?php

namespace App\Http\Controllers\Web;

use App\Domain\Metricas\ReportesService;
use App\Http\Controllers\Controller;
use App\Models\Almacen;
use App\Models\CategoriaMaterial;
use App\Models\Obra;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Reportes funcionales e impacto del software.
 *
 * Los filtros viven en la URL para que el usuario pueda compartir una consulta
 * y el backend recalcula todos los indicadores desde los registros reales.
 */
class ReportesViewController extends Controller
{
    public function __construct(private readonly ReportesService $reportes) {}

    public function index(Request $request): Response
    {
        $filtros = $this->filtros($request);

        return Inertia::render('ReportesPage', [
            'reportes' => $this->reportes->resumen($filtros),
            'filtros' => $filtros,
            'catalogos' => [
                'obras' => Obra::query()
                    ->orderBy('nombre')
                    ->get(['id', 'codigo', 'nombre'])
                    ->map(fn (Obra $obra): array => [
                        'id' => $obra->id,
                        'codigo' => $obra->codigo,
                        'nombre' => $obra->nombre,
                    ])
                    ->values(),
                'almacenes' => Almacen::query()
                    ->when($filtros['obra_id'] !== null, fn ($q) => $q->where('obra_id', $filtros['obra_id']))
                    ->orderBy('nombre')
                    ->get(['id', 'codigo', 'nombre', 'obra_id'])
                    ->map(fn (Almacen $almacen): array => [
                        'id' => $almacen->id,
                        'codigo' => $almacen->codigo,
                        'nombre' => $almacen->nombre,
                        'obra_id' => $almacen->obra_id,
                    ])
                    ->values(),
                'categorias' => CategoriaMaterial::query()
                    ->orderBy('nombre')
                    ->get(['id', 'nombre'])
                    ->values(),
            ],
        ]);
    }

    /**
     * @return array{desde: string, hasta: string, obra_id: int|null, almacen_id: int|null, categoria_id: int|null}
     */
    private function filtros(Request $request): array
    {
        $hasta = $this->fecha($request->query('hasta')) ?? CarbonImmutable::now();
        $desde = $this->fecha($request->query('desde')) ?? $hasta->subDays(29);

        if ($desde->greaterThan($hasta)) {
            [$desde, $hasta] = [$hasta, $desde];
        }

        return [
            'desde' => $desde->toDateString(),
            'hasta' => $hasta->toDateString(),
            'obra_id' => $this->entero($request->query('obra_id')),
            'almacen_id' => $this->entero($request->query('almacen_id')),
            'categoria_id' => $this->entero($request->query('categoria_id')),
        ];
    }

    private function fecha(mixed $valor): ?CarbonImmutable
    {
        if (! is_string($valor) || trim($valor) === '') {
            return null;
        }

        try {
            return CarbonImmutable::parse($valor)->startOfDay();
        } catch (\Throwable) {
            return null;
        }
    }

    private function entero(mixed $valor): ?int
    {
        if ($valor === null || $valor === '' || ! is_numeric($valor)) {
            return null;
        }

        $numero = (int) $valor;

        return $numero > 0 ? $numero : null;
    }
}
