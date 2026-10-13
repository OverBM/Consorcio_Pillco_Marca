<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Proyectos\EvmService;
use App\Http\Controllers\Controller;
use App\Models\Hito;
use App\Models\LineaBaseCosto;
use App\Models\Obra;
use App\Models\ObraFase;
use App\Models\Valorizacion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProyectoController extends Controller
{
    public function __construct(
        protected EvmService $evmService
    ) {}

    /**
     * Listado público de proyectos para la portada.
     *
     * Expone únicamente los campos de presentación pública
     * (identificador, nombre, programa, distrito, estado y avance)
     * y permite filtrar por estado y/o distrito.
     */
    public function index(Request $request): JsonResponse
    {
        $proyectos = Obra::query()
            ->with('programa:id,nombre')
            ->when($request->filled('estado'), fn ($q) => $q->where('estado', $request->input('estado')))
            ->when($request->filled('distrito'), fn ($q) => $q->where('distrito', $request->input('distrito')))
            ->orderBy('nombre')
            ->get()
            ->map(fn (Obra $obra): array => [
                'id' => $obra->id,
                'codigo' => $obra->codigo,
                'nombre' => $obra->nombre,
                'programa' => $obra->programa?->nombre,
                'distrito' => $obra->distrito,
                'estado' => $obra->estado,
                'avance' => (float) $obra->avance_fisico_pct,
            ])
            ->all();

        return response()->json([
            'success' => true,
            'data' => $proyectos,
            'meta' => [
                'total' => count($proyectos),
            ],
        ]);
    }

    /**
     * Detalle completo del proyecto con análisis EVM y cronograma.
     */
    public function show(int $id): JsonResponse
    {
        $obra = Obra::with(['fases', 'hitos', 'lineasBaseCosto', 'avancesFisicos.partida', 'valorizaciones'])
            ->findOrFail($id);

        $lineaBase = LineaBaseCosto::where('obra_id', $obra->id)->where('vigente', true)->first();
        $bac = (float) ($lineaBase?->bac ?? 0);

        // Última valorización para cálculo EVM
        $ultimaVal = Valorizacion::where('obra_id', $obra->id)->orderBy('periodo', 'desc')->first();

        $pv = (float) ($ultimaVal?->valor_planificado ?? 0);
        $ev = (float) ($ultimaVal?->valor_ganado ?? 0);
        $ac = (float) ($ultimaVal?->costo_real ?? 0);

        $evm = $this->evmService->calcularMetricas($pv, $ev, $ac, $bac);

        return response()->json([
            'success' => true,
            'data' => [
                'obra' => $obra,
                'linea_base' => $lineaBase,
                'evm' => $evm,
            ],
        ]);
    }

    /**
     * Gestionar o avanzar fase del ciclo de vida PMI.
     */
    public function gestionarFase(Request $request, int $obraId): JsonResponse
    {
        $validated = $request->validate([
            'fase' => 'required|string|in:inicio,planificacion,ejecucion,monitoreo_control,cierre',
            'estado' => 'required|string|in:pendiente,en_proceso,aprobada,rechazada',
            'observaciones' => 'nullable|string',
        ]);

        $obra = Obra::findOrFail($obraId);
        $usuarioId = $request->user()?->id ?? 1;

        $obraFase = ObraFase::updateOrCreate(
            ['obra_id' => $obra->id, 'fase' => $validated['fase']],
            [
                'estado' => $validated['estado'],
                'aprobada_por' => $validated['estado'] === 'aprobada' ? $usuarioId : null,
                'aprobada_en' => $validated['estado'] === 'aprobada' ? now() : null,
                'observaciones' => $validated['observaciones'] ?? null,
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Fase del proyecto actualizada exitosamente.',
            'data' => $obraFase,
        ]);
    }

    /**
     * Crear hito de cronograma.
     */
    public function crearHito(Request $request, int $obraId): JsonResponse
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:160',
            'fecha_planificada' => 'required|date',
            'fecha_real' => 'nullable|date',
            'estado' => 'nullable|string|in:pendiente,en_proceso,cumplido,retrasado',
        ]);

        $obra = Obra::findOrFail($obraId);

        $hito = Hito::create([
            'obra_id' => $obra->id,
            'nombre' => $validated['nombre'],
            'fecha_planificada' => $validated['fecha_planificada'],
            'fecha_real' => $validated['fecha_real'] ?? null,
            'estado' => $validated['estado'] ?? 'pendiente',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Hito registrado exitosamente.',
            'data' => $hito,
        ], 201);
    }
}
