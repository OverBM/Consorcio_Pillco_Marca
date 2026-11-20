<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Inventario\StockService;
use App\Http\Controllers\Controller;
use App\Models\Transferencia;
use App\Models\TransferenciaDetalle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DespachoController extends Controller
{
    public function __construct(
        protected StockService $stockService
    ) {}

    /**
     * Listar despachos físicos (transferencias con despacho registrado).
     */
    public function index(Request $request): JsonResponse
    {
        $query = Transferencia::with([
            'almacenOrigen.obra',
            'almacenDestino.obra',
            'detalles.material',
            'despachador',
        ])
            ->whereNotNull('despachado_por')
            ->orderBy('id', 'desc');

        if ($request->filled('transferencia_id')) {
            $query->where('id', $request->input('transferencia_id'));
        }

        $despachos = $query->paginate($request->integer('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => collect($despachos->items())->map(fn (Transferencia $transferencia): array => [
                'id' => $transferencia->id,
                'transferencia_id' => $transferencia->id,
                'despachado_por' => $transferencia->despachado_por,
                'despachado_en' => $transferencia->despachado_en,
                'observaciones' => $transferencia->observaciones_despacho,
                'despachador' => $transferencia->despachador,
                'transferencia' => [
                    'id' => $transferencia->id,
                    'codigo' => $transferencia->codigo,
                    'estado' => $transferencia->estado,
                    'almacen_origen' => $transferencia->almacenOrigen,
                    'almacen_destino' => $transferencia->almacenDestino,
                    'detalles' => $transferencia->detalles,
                ],
            ])->all(),
            'meta' => [
                'current_page' => $despachos->currentPage(),
                'last_page' => $despachos->lastPage(),
                'total' => $despachos->total(),
            ],
        ]);
    }

    /**
     * Registrar despacho físico de una transferencia aprobada y egresar existencias de origen.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'transferencia_id' => 'required|exists:transferencias,id',
            'observaciones' => 'nullable|string',
            'detalles' => 'required|array|min:1',
            'detalles.*.id' => 'required|exists:transferencia_detalles,id',
            'detalles.*.cantidad_despachada' => 'required|numeric|min:0.001',
        ]);

        $transferencia = Transferencia::with('detalles')->findOrFail($validated['transferencia_id']);
        $usuarioId = $request->user()?->id ?? 1;

        $transferencia = DB::transaction(function () use ($transferencia, $validated, $usuarioId) {
            $transferencia->update([
                'despachado_por' => $usuarioId,
                'despachado_en' => now(),
                'observaciones_despacho' => $validated['observaciones'] ?? null,
                'estado' => 'en_transito',
            ]);

            foreach ($validated['detalles'] as $itemDetalle) {
                $det = TransferenciaDetalle::findOrFail($itemDetalle['id']);
                $det->update(['cantidad_despachada' => $itemDetalle['cantidad_despachada']]);

                $this->stockService->egresarStock(
                    almacenId: $transferencia->almacen_origen_id,
                    materialId: $det->material_id,
                    cantidad: (float) $itemDetalle['cantidad_despachada'],
                    tipoMovimiento: 'salida_transferencia',
                    documentoTipo: 'transferencia',
                    documentoId: $transferencia->id,
                    usuarioId: $usuarioId,
                    observacion: 'Despacho Transferencia '.$transferencia->codigo,
                    liberarReservaPrevia: true
                );
            }

            return $transferencia->fresh(['detalles']);
        });

        return response()->json([
            'success' => true,
            'message' => 'Despacho registrado y mercadería en tránsito.',
            'data' => [
                'id' => $transferencia->id,
                'transferencia_id' => $transferencia->id,
                'despachado_por' => $transferencia->despachado_por,
                'despachado_en' => $transferencia->despachado_en,
                'observaciones' => $transferencia->observaciones_despacho,
                'transferencia' => $transferencia,
            ],
        ], 201);
    }
}
