<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Inventario\StockService;
use App\Http\Controllers\Controller;
use App\Models\SolicitudMaterial;
use App\Models\SolicitudMaterialDetalle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SolicitudMaterialController extends Controller
{
    public function __construct(
        protected StockService $stockService,
    ) {}

    /**
     * Listar solicitudes de material por obra / almacén.
     */
    public function index(Request $request): JsonResponse
    {
        $query = SolicitudMaterial::with(['obra', 'almacen', 'solicitante', 'partida', 'detalles.material'])
            ->orderBy('id', 'desc');

        if ($request->filled('obra_id')) {
            $query->where('obra_id', $request->input('obra_id'));
        }

        if ($request->filled('almacen_id')) {
            $query->where('almacen_id', $request->input('almacen_id'));
        }

        if ($request->filled('estado')) {
            $query->where('estado', $request->input('estado'));
        }

        $solicitudes = $query->paginate($request->integer('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $solicitudes->items(),
            'meta' => [
                'current_page' => $solicitudes->currentPage(),
                'last_page' => $solicitudes->lastPage(),
                'total' => $solicitudes->total(),
            ],
        ]);
    }

    /**
     * Crear nueva solicitud de material desde el frente de obra vinculada a partida.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'obra_id' => 'required|exists:obras,id',
            'almacen_id' => 'required|exists:almacenes,id',
            'frente_id' => 'nullable|integer',
            'partida_id' => 'nullable|exists:partidas,id',
            'urgente' => 'nullable|boolean',
            'detalles' => 'required|array|min:1',
            'detalles.*.material_id' => 'required|exists:materiales,id',
            'detalles.*.cantidad' => 'required|numeric|min:0.001',
        ]);

        $usuarioId = $request->user()?->id ?? 1;

        $solicitud = DB::transaction(function () use ($validated, $usuarioId) {
            $codigo = 'SOL-'.date('Ymd').'-'.strtoupper(Str::random(4));

            $solicitud = SolicitudMaterial::create([
                'codigo' => $codigo,
                'obra_id' => $validated['obra_id'],
                'almacen_id' => $validated['almacen_id'],
                'solicitante_id' => $usuarioId,
                'frente_id' => $validated['frente_id'] ?? null,
                'partida_id' => $validated['partida_id'] ?? null,
                'urgente' => $validated['urgente'] ?? false,
                'estado' => 'registrada',
            ]);

            foreach ($validated['detalles'] as $item) {
                SolicitudMaterialDetalle::create([
                    'solicitud_id' => $solicitud->id,
                    'material_id' => $item['material_id'],
                    'cantidad' => $item['cantidad'],
                    'cantidad_atendida' => 0,
                ]);
            }

            return $solicitud;
        });

        return response()->json([
            'success' => true,
            'message' => 'Solicitud de material registrada exitosamente.',
            'data' => $solicitud->load(['detalles.material', 'obra', 'almacen']),
        ], 201);
    }

    /**
     * Atender / despachar solicitud descontando del stock.
     */
    public function atender(Request $request, int $id): JsonResponse
    {
        $solicitud = SolicitudMaterial::with('detalles')->findOrFail($id);
        $usuarioId = $request->user()?->id ?? 1;

        DB::transaction(function () use ($solicitud, $usuarioId) {
            foreach ($solicitud->detalles as $detalle) {
                $this->stockService->egresarStock(
                    almacenId: $solicitud->almacen_id,
                    materialId: $detalle->material_id,
                    cantidad: (float) $detalle->cantidad,
                    tipoMovimiento: 'salida_consumo',
                    documentoTipo: 'solicitud',
                    documentoId: $solicitud->id,
                    usuarioId: $usuarioId,
                    observacion: 'Despacho a frente Solicitud '.$solicitud->codigo
                );

                $detalle->update(['cantidad_atendida' => $detalle->cantidad]);
            }

            $solicitud->update([
                'estado' => 'atendida',
                'atendida_en' => now(),
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Solicitud atendida y stock descontado exitosamente.',
            'data' => $solicitud->fresh()->load('detalles.material'),
        ]);
    }
}
