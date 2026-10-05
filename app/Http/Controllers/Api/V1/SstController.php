<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Inventario\StockService;
use App\Http\Controllers\Controller;
use App\Models\Capacitacion;
use App\Models\EppAsignacion;
use App\Models\Incidente;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SstController extends Controller
{
    public function __construct(
        protected StockService $stockService
    ) {}

    /**
     * Listar incidentes de seguridad y salud en el trabajo.
     */
    public function indexIncidentes(Request $request): JsonResponse
    {
        $query = Incidente::with(['obra', 'trabajador', 'reportador'])->orderBy('ocurrido_en', 'desc');

        if ($request->filled('obra_id')) {
            $query->where('obra_id', $request->input('obra_id'));
        }

        $incidentes = $query->paginate($request->integer('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $incidentes->items(),
            'meta' => [
                'current_page' => $incidentes->currentPage(),
                'last_page' => $incidentes->lastPage(),
                'total' => $incidentes->total(),
            ],
        ]);
    }

    /**
     * Reportar nuevo incidente o accidente de trabajo.
     */
    public function storeIncidente(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'obra_id' => 'required|exists:obras,id',
            'trabajador_id' => 'nullable|exists:trabajadores,id',
            'tipo' => 'required|string|max:10',
            'gravedad' => 'required|string|in:leve,grave,fatal',
            'ocurrido_en' => 'required|date',
            'descripcion' => 'required|string',
            'requiere_traslado' => 'nullable|boolean',
            'causas' => 'nullable|string',
        ]);

        $usuarioId = $request->user()?->id ?? 1;
        $codigo = 'INC-'.date('Ymd').'-'.strtoupper(Str::random(4));

        $incidente = Incidente::create([
            'codigo' => $codigo,
            'obra_id' => $validated['obra_id'],
            'trabajador_id' => $validated['trabajador_id'] ?? null,
            'reportado_por' => $usuarioId,
            'tipo' => $validated['tipo'],
            'gravedad' => $validated['gravedad'],
            'ocurrido_en' => $validated['ocurrido_en'],
            'descripcion' => $validated['descripcion'],
            'requiere_traslado' => $validated['requiere_traslado'] ?? false,
            'estado' => 'reportado',
            'causas' => $validated['causas'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Incidente de seguridad registrado.',
            'data' => $incidente->load(['obra', 'trabajador']),
        ], 201);
    }

    /**
     * Listar asignaciones de EPP a personal operativo.
     */
    public function indexEppAsignaciones(Request $request): JsonResponse
    {
        $query = EppAsignacion::with(['trabajador', 'material', 'almacen'])->orderBy('entregado_en', 'desc');

        if ($request->filled('trabajador_id')) {
            $query->where('trabajador_id', $request->input('trabajador_id'));
        }

        $asignaciones = $query->paginate($request->integer('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $asignaciones->items(),
            'meta' => [
                'current_page' => $asignaciones->currentPage(),
                'last_page' => $asignaciones->lastPage(),
                'total' => $asignaciones->total(),
            ],
        ]);
    }

    /**
     * Asignar EPP serializado con egreso automático de almacén.
     */
    public function storeEppAsignacion(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'trabajador_id' => 'required|exists:trabajadores,id',
            'almacen_id' => 'required|exists:almacenes,id',
            'material_id' => 'required|exists:materiales,id',
            'numero_serie' => 'nullable|string|max:60',
        ]);

        $usuarioId = $request->user()?->id ?? 1;

        $asignacion = DB::transaction(function () use ($validated, $usuarioId) {
            $asignacion = EppAsignacion::create([
                'trabajador_id' => $validated['trabajador_id'],
                'almacen_id' => $validated['almacen_id'],
                'material_id' => $validated['material_id'],
                'numero_serie' => $validated['numero_serie'] ?? null,
                'entregado_por' => $usuarioId,
                'entregado_en' => now(),
                'estado' => 'vigente',
            ]);

            // Egresar 1 unidad de EPP del stock del almacén con registro en Kardex
            $this->stockService->egresarStock(
                almacenId: $validated['almacen_id'],
                materialId: $validated['material_id'],
                cantidad: 1.0,
                tipoMovimiento: 'salida_epp',
                documentoTipo: 'epp_asignacion',
                documentoId: $asignacion->id,
                usuarioId: $usuarioId,
                observacion: 'Entrega de EPP al trabajador con serie: '.($validated['numero_serie'] ?? 'S/N')
            );

            return $asignacion;
        });

        return response()->json([
            'success' => true,
            'message' => 'EPP asignado al trabajador y descargado del inventario.',
            'data' => $asignacion->load(['trabajador', 'material', 'almacen']),
        ], 201);
    }

    /**
     * Listar y programar capacitaciones SST.
     */
    public function indexCapacitaciones(Request $request): JsonResponse
    {
        $query = Capacitacion::with('obra')->orderBy('fecha_programada', 'desc');

        $capacitaciones = $query->paginate($request->integer('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $capacitaciones->items(),
            'meta' => [
                'current_page' => $capacitaciones->currentPage(),
                'last_page' => $capacitaciones->lastPage(),
                'total' => $capacitaciones->total(),
            ],
        ]);
    }

    public function storeCapacitacion(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tipo' => 'required|string|max:15',
            'titulo' => 'required|string|max:200',
            'obra_id' => 'nullable|exists:obras,id',
            'fecha_programada' => 'required|date',
            'instructor' => 'nullable|string|max:120',
            'nota_minima' => 'nullable|numeric|min:0|max:20',
        ]);

        $usuarioId = $request->user()?->id ?? 1;

        $capacitacion = Capacitacion::create(array_merge($validated, [
            'programada_por' => $usuarioId,
            'estado' => 'programada',
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Capacitación SST programada.',
            'data' => $capacitacion,
        ], 201);
    }
}
