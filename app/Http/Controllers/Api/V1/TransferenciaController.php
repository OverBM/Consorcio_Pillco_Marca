<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Inventario\StockService;
use App\Http\Controllers\Controller;
use App\Models\ConfirmacionRecepcionDestino;
use App\Models\Transferencia;
use App\Models\TransferenciaDetalle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TransferenciaController extends Controller
{
    public function __construct(
        protected StockService $stockService
    ) {}

    /**
     * Listar transferencias entre almacenes con filtros.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Transferencia::with([
            'almacenOrigen.obra',
            'almacenDestino.obra',
            'creador',
            'aprobador',
            'detalles.material',
            'despacho',
            'confirmacionRecepcion',
        ])->orderBy('id', 'desc');

        if ($request->filled('estado')) {
            $query->where('estado', $request->input('estado'));
        }

        if ($request->filled('almacen_id')) {
            $almId = $request->input('almacen_id');
            $query->where(function ($q) use ($almId) {
                $q->where('almacen_origen_id', $almId)
                    ->orWhere('almacen_destino_id', $almId);
            });
        }

        $transferencias = $query->paginate($request->integer('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $transferencias->items(),
            'meta' => [
                'current_page' => $transferencias->currentPage(),
                'last_page' => $transferencias->lastPage(),
                'total' => $transferencias->total(),
            ],
        ]);
    }

    /**
     * Crear una nueva solicitud de transferencia inter-obras.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'almacen_origen_id' => 'required|exists:almacenes,id|different:almacen_destino_id',
            'almacen_destino_id' => 'required|exists:almacenes,id',
            'motivo' => 'required|string|max:25',
            'solicitud_id' => 'nullable|exists:solicitudes_material,id',
            'excedente_id' => 'nullable|exists:excedentes_detectados,id',
            'detalles' => 'required|array|min:1',
            'detalles.*.material_id' => 'required|exists:materiales,id',
            'detalles.*.cantidad_solicitada' => 'required|numeric|min:0.001',
        ]);

        $usuarioId = $request->user()?->id ?? 1;

        $transferencia = DB::transaction(function () use ($validated, $usuarioId) {
            $codigo = 'TRF-'.date('Ymd').'-'.strtoupper(Str::random(4));

            $transferencia = Transferencia::create([
                'codigo' => $codigo,
                'almacen_origen_id' => $validated['almacen_origen_id'],
                'almacen_destino_id' => $validated['almacen_destino_id'],
                'solicitud_id' => $validated['solicitud_id'] ?? null,
                'excedente_id' => $validated['excedente_id'] ?? null,
                'motivo' => $validated['motivo'],
                'estado' => 'solicitada',
                'creada_por' => $usuarioId,
            ]);

            foreach ($validated['detalles'] as $item) {
                TransferenciaDetalle::create([
                    'transferencia_id' => $transferencia->id,
                    'material_id' => $item['material_id'],
                    'cantidad_solicitada' => $item['cantidad_solicitada'],
                ]);
            }

            return $transferencia;
        });

        return response()->json([
            'success' => true,
            'message' => 'Transferencia registrada exitosamente.',
            'data' => $transferencia->load(['almacenOrigen', 'almacenDestino', 'detalles.material']),
        ], 201);
    }

    /**
     * Aprobar transferencia y reservar existencias en origen.
     */
    public function aprobar(Request $request, int $id): JsonResponse
    {
        $transferencia = Transferencia::with('detalles')->findOrFail($id);
        $usuarioId = $request->user()?->id ?? 1;

        DB::transaction(function () use ($transferencia, $usuarioId) {
            foreach ($transferencia->detalles as $det) {
                $this->stockService->reservarStock(
                    almacenId: $transferencia->almacen_origen_id,
                    materialId: $det->material_id,
                    cantidad: (float) $det->cantidad_solicitada
                );
            }

            $transferencia->update([
                'estado' => 'aprobada',
                'aprobada_por' => $usuarioId,
                'aprobada_en' => now(),
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Transferencia aprobada y stock reservado en origen.',
            'data' => $transferencia->fresh(),
        ]);
    }

    /**
     * Confirmar recepción física e-POD en destino e ingresar al inventario de destino.
     */
    public function confirmarRecepcion(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'firma_ruta' => 'nullable|string',
            'foto_ruta' => 'nullable|string',
            'hay_diferencias' => 'nullable|boolean',
            'observaciones' => 'nullable|string',
            'detalles' => 'required|array|min:1',
            'detalles.*.id' => 'required|exists:transferencia_detalles,id',
            'detalles.*.cantidad_recibida' => 'required|numeric|min:0',
        ]);

        $transferencia = Transferencia::with('detalles')->findOrFail($id);
        $usuarioId = $request->user()?->id ?? 1;

        DB::transaction(function () use ($transferencia, $validated, $usuarioId) {
            ConfirmacionRecepcionDestino::create([
                'transferencia_id' => $transferencia->id,
                'almacenero_id' => $usuarioId,
                'recibida_en' => now(),
                'firma_ruta' => $validated['firma_ruta'] ?? null,
                'foto_ruta' => $validated['foto_ruta'] ?? null,
                'hay_diferencias' => $validated['hay_diferencias'] ?? false,
                'observaciones' => $validated['observaciones'] ?? null,
            ]);

            foreach ($validated['detalles'] as $itemDetalle) {
                $det = TransferenciaDetalle::findOrFail($itemDetalle['id']);
                $det->update(['cantidad_recibida' => $itemDetalle['cantidad_recibida']]);

                // Ingresar stock al almacén de destino con asiento en Kardex
                if ((float) $itemDetalle['cantidad_recibida'] > 0) {
                    $this->stockService->ingresarStock(
                        almacenId: $transferencia->almacen_destino_id,
                        materialId: $det->material_id,
                        cantidad: (float) $itemDetalle['cantidad_recibida'],
                        tipoMovimiento: 'ingreso_transferencia',
                        documentoTipo: 'transferencia',
                        documentoId: $transferencia->id,
                        usuarioId: $usuarioId,
                        observacion: 'Recepción e-POD Transferencia '.$transferencia->codigo
                    );
                }
            }

            $transferencia->update(['estado' => 'completada']);
        });

        return response()->json([
            'success' => true,
            'message' => 'Transferencia recibida conforme e inventario actualizado en destino.',
            'data' => $transferencia->fresh()->load(['confirmacionRecepcion', 'detalles']),
        ]);
    }
}
