<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Proyectos\EvmService;
use App\Http\Controllers\Controller;
use App\Models\LineaBaseCosto;
use App\Models\Valorizacion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ValorizacionController extends Controller
{
    public function __construct(
        protected EvmService $evmService
    ) {}

    /**
     * Listar valorizaciones de obra con indicadores EVM calculados.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Valorizacion::with(['obra', 'aprobador'])
            ->orderBy('periodo', 'desc');

        if ($request->filled('obra_id')) {
            $query->where('obra_id', $request->input('obra_id'));
        }

        $valorizaciones = $query->paginate($request->integer('per_page', 20));

        $data = collect($valorizaciones->items())->map(function ($val) {
            $lineaBase = LineaBaseCosto::where('obra_id', $val->obra_id)->where('vigente', true)->first();
            $bac = (float) ($lineaBase?->bac ?? 0);
            $metrics = $this->evmService->calcularMetricas(
                (float) $val->valor_planificado,
                (float) $val->valor_ganado,
                (float) $val->costo_real,
                $bac
            );

            return array_merge($val->toArray(), ['evm' => $metrics]);
        });

        return response()->json([
            'success' => true,
            'data' => $data,
            'meta' => [
                'current_page' => $valorizaciones->currentPage(),
                'last_page' => $valorizaciones->lastPage(),
                'total' => $valorizaciones->total(),
            ],
        ]);
    }

    /**
     * Registrar nueva valorización contractual mensual.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'obra_id' => 'required|exists:obras,id',
            'periodo' => 'required|date',
            'valor_planificado' => 'required|numeric|min:0',
            'valor_ganado' => 'required|numeric|min:0',
            'costo_real' => 'required|numeric|min:0',
        ]);

        $valorizacion = Valorizacion::updateOrCreate(
            [
                'obra_id' => $validated['obra_id'],
                'periodo' => $validated['periodo'],
            ],
            [
                'valor_planificado' => $validated['valor_planificado'],
                'valor_ganado' => $validated['valor_ganado'],
                'costo_real' => $validated['costo_real'],
                'estado' => 'borrador',
            ]
        );

        $lineaBase = LineaBaseCosto::where('obra_id', $valorizacion->obra_id)->where('vigente', true)->first();
        $bac = (float) ($lineaBase?->bac ?? 0);
        $metrics = $this->evmService->calcularMetricas(
            (float) $valorizacion->valor_planificado,
            (float) $valorizacion->valor_ganado,
            (float) $valorizacion->costo_real,
            $bac
        );

        return response()->json([
            'success' => true,
            'message' => 'Valorización mensual registrada exitosamente.',
            'data' => array_merge($valorizacion->load('obra')->toArray(), ['evm' => $metrics]),
        ], 201);
    }

    /**
     * Aprobar valorización mensual.
     */
    public function aprobar(Request $request, int $id): JsonResponse
    {
        $valorizacion = Valorizacion::findOrFail($id);
        $usuarioId = $request->user()?->id ?? 1;

        $valorizacion->update([
            'estado' => 'aprobada',
            'aprobada_por' => $usuarioId,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Valorización aprobada formalmente.',
            'data' => $valorizacion->fresh(),
        ]);
    }
}
