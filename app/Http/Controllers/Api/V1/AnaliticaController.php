<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Analitica\RedistribucionAnaliticaService;
use App\Domain\Geo\ResumenCuotaRuteo;
use App\Http\Controllers\Controller;
use App\Models\AlertaAbastecimiento;
use App\Models\EjecucionAnalitica;
use App\Models\ParametroInventario;
use App\Models\PronosticoDemanda;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Throwable;

class AnaliticaController extends Controller
{
    public function __construct(
        private readonly ResumenCuotaRuteo $cuotaRuteo,
        private readonly RedistribucionAnaliticaService $redistribucion,
    ) {}

    public function parametros(Request $request): JsonResponse
    {
        $query = ParametroInventario::query()
            ->with(['almacen:id,nombre,obra_id', 'material:id,codigo,nombre'])
            ->where('vigente', true)
            ->when($request->filled('almacen_id'), fn ($q) => $q->where('almacen_id', $request->integer('almacen_id')))
            ->when($request->filled('material_id'), fn ($q) => $q->where('material_id', $request->integer('material_id')))
            ->when($request->filled('clase'), fn ($q) => $q->where('clase_abc', $request->input('clase')))
            ->when($request->filled('estado'), fn ($q) => $q->where('estado', $request->input('estado')))
            ->orderBy('clase_abc')
            ->orderBy('material_id');

        return $this->paginar($query->paginate($request->integer('per_page', 25)));
    }

    public function pronosticos(Request $request): JsonResponse
    {
        $query = PronosticoDemanda::query()
            ->with(['almacen:id,nombre', 'material:id,codigo,nombre'])
            ->when($request->filled('almacen_id'), fn ($q) => $q->where('almacen_id', $request->integer('almacen_id')))
            ->when($request->filled('material_id'), fn ($q) => $q->where('material_id', $request->integer('material_id')))
            ->when($request->filled('desde'), fn ($q) => $q->whereDate('fecha', '>=', $request->input('desde')))
            ->when($request->filled('hasta'), fn ($q) => $q->whereDate('fecha', '<=', $request->input('hasta')))
            ->orderBy('fecha')
            ->orderBy('material_id');

        return $this->paginar($query->paginate($request->integer('per_page', 100)));
    }

    public function alertas(Request $request): JsonResponse
    {
        $query = AlertaAbastecimiento::query()
            ->with(['almacen:id,nombre', 'material:id,codigo,nombre', 'reconocidaPor:id,name'])
            ->when($request->filled('estado'), fn ($q) => $q->where('estado', $request->input('estado')))
            ->when($request->filled('severidad'), fn ($q) => $q->where('severidad', $request->input('severidad')))
            ->when($request->filled('tipo'), fn ($q) => $q->where('tipo', $request->input('tipo')))
            ->when($request->filled('almacen_id'), fn ($q) => $q->where('almacen_id', $request->integer('almacen_id')))
            ->orderByRaw("CASE severidad WHEN 'critica' THEN 1 WHEN 'alta' THEN 2 WHEN 'media' THEN 3 ELSE 4 END")
            ->orderBy('fecha_estimada');

        return $this->paginar($query->paginate($request->integer('per_page', 25)));
    }

    public function resumen(): JsonResponse
    {
        $ultima = EjecucionAnalitica::query()->latest('inicio')->first();

        return response()->json([
            'success' => true,
            'data' => [
                'parametros_vigentes' => ParametroInventario::query()->where('vigente', true)->count(),
                'parametros_incompletos' => ParametroInventario::query()
                    ->where('vigente', true)
                    ->where('estado', 'parametros_incompletos')
                    ->count(),
                'alertas_vigentes' => AlertaAbastecimiento::query()->where('estado', 'vigente')->count(),
                'alertas_criticas' => AlertaAbastecimiento::query()
                    ->where('estado', 'vigente')
                    ->where('severidad', 'critica')
                    ->count(),
                'quiebres_7d' => AlertaAbastecimiento::query()
                    ->where('estado', 'vigente')
                    ->where('tipo', 'quiebre_proyectado')
                    ->whereDate('fecha_estimada', '<=', now()->addDays(7)->toDateString())
                    ->count(),
                'ultima_ejecucion' => $ultima,
                'cuota_ruteo' => $this->cuotaRuteo->hoy(),
                'cuota_ruteo_semana' => $this->cuotaRuteo->ultimosDias(7),
            ],
        ]);
    }

    public function redistribucion(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->redistribucion->sugerencias(
                $request->filled('almacen_id') ? $request->integer('almacen_id') : null,
                $request->filled('obra_id') ? $request->integer('obra_id') : null,
                $request->integer('limite', 8),
            ),
        ]);
    }

    public function ejecuciones(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => EjecucionAnalitica::query()->latest('inicio')->limit(30)->get(),
        ]);
    }

    /**
     * Dispara una corrida manual del motor predictivo desde la interfaz.
     */
    public function ejecutar(): JsonResponse
    {
        try {
            $codigo = Artisan::call('analitica:ejecutar', [
                '--origen' => 'manual',
            ]);

            $salida = trim(Artisan::output());
        } catch (Throwable $error) {
            return response()->json([
                'success' => false,
                'message' => 'No se pudo ejecutar la analítica: '.$error->getMessage(),
            ], 500);
        }

        if ($codigo !== 0) {
            return response()->json([
                'success' => false,
                'message' => $salida !== ''
                    ? $salida
                    : 'La ejecución de analítica no terminó correctamente.',
            ], 422);
        }

        $ultima = EjecucionAnalitica::query()->latest('inicio')->first();

        preg_match('/(\d+)\s+pronósticos/u', $salida, $pronosticos);

        return response()->json([
            'success' => true,
            'message' => $salida !== '' ? $salida : 'Analítica regenerada.',
            'data' => [
                'ejecucion' => $ultima,
                'parametros' => ParametroInventario::query()
                    ->where('vigente', true)
                    ->count(),
                'parametros_calculados' => $ultima?->calculadas ?? 0,
                'pronosticos' => (int) ($pronosticos[1] ?? 0),
                'alertas' => $ultima?->alertas ?? 0,
            ],
        ]);
    }

    public function reconocer(Request $request, int $id): JsonResponse
    {
        $alerta = AlertaAbastecimiento::query()->findOrFail($id);

        $alerta->update([
            'estado' => 'reconocida',
            'reconocida_por' => $request->user()?->id,
            'reconocida_en' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Alerta reconocida.',
            'data' => $alerta->fresh(),
        ]);
    }

    /**
     * @param  LengthAwarePaginator<int, mixed>  $paginator
     */
    private function paginar($paginator): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'total' => $paginator->total(),
                'per_page' => $paginator->perPage(),
            ],
        ]);
    }
}
