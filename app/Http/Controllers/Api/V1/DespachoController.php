<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Inventario\StockService;
use App\Http\Controllers\Controller;
use App\Models\Despacho;
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

        $despacho = DB::transaction(function () use ($transferencia, $validated, $usuarioId) {
            $despacho = Despacho::create([
                'transferencia_id' => $transferencia->id,
                'despachado_por' => $usuarioId,
                'despachado_en' => now(),
                'observaciones' => $validated['observaciones'] ?? null,
            ]);

            foreach ($validated['detalles'] as $itemDetalle) {
                $det = TransferenciaDetalle::findOrFail($itemDetalle['id']);
                $det->update(['cantidad_despachada' => $itemDetalle['cantidad_despachada']]);

                // Egresar stock de origen liberando la reserva previa y registrando en Kardex
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

            $transferencia->update(['estado' => 'en_transito']);

            return $despacho;
        });

        return response()->json([
            'success' => true,
            'message' => 'Despacho registrado y mercadería en tránsito.',
            'data' => $despacho->load('transferencia.detalles'),
        ], 201);
    }
}
