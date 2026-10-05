<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Inventario\StockService;
use App\Http\Controllers\Controller;
use App\Models\DevolucionDetalle;
use App\Models\DevolucionProveedor;
use App\Models\Recepcion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DevolucionController extends Controller
{
    public function __construct(
        protected StockService $stockService
    ) {}

    /**
     * Listar devoluciones a proveedores.
     */
    public function index(Request $request): JsonResponse
    {
        $query = DevolucionProveedor::with(['recepcion.almacen', 'proveedor', 'registrador', 'detalles.material'])
            ->orderBy('id', 'desc');

        $devoluciones = $query->paginate($request->integer('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $devoluciones->items(),
            'meta' => [
                'current_page' => $devoluciones->currentPage(),
                'last_page' => $devoluciones->lastPage(),
                'total' => $devoluciones->total(),
            ],
        ]);
    }

    /**
     * Registrar devolución a proveedor por material defectuoso o disconforme y egresar de inventario.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'recepcion_id' => 'required|exists:recepciones,id',
            'proveedor_id' => 'required|exists:proveedores,id',
            'motivo' => 'required|string',
            'detalles' => 'required|array|min:1',
            'detalles.*.material_id' => 'required|exists:materiales,id',
            'detalles.*.cantidad' => 'required|numeric|min:0.001',
            'detalles.*.lote_id' => 'nullable|exists:lotes,id',
        ]);

        $usuarioId = $request->user()?->id ?? 1;
        $recepcion = Recepcion::findOrFail($validated['recepcion_id']);

        $devolucion = DB::transaction(function () use ($validated, $usuarioId, $recepcion) {
            $codigo = 'DEV-'.date('Ymd').'-'.strtoupper(Str::random(4));

            $devolucion = DevolucionProveedor::create([
                'codigo' => $codigo,
                'recepcion_id' => $validated['recepcion_id'],
                'proveedor_id' => $validated['proveedor_id'],
                'motivo' => $validated['motivo'],
                'estado' => 'registrada',
                'registrada_por' => $usuarioId,
            ]);

            foreach ($validated['detalles'] as $item) {
                DevolucionDetalle::create([
                    'devolucion_id' => $devolucion->id,
                    'material_id' => $item['material_id'],
                    'lote_id' => $item['lote_id'] ?? null,
                    'cantidad' => $item['cantidad'],
                ]);

                // Egresar del inventario con asiento en Kardex
                $this->stockService->egresarStock(
                    almacenId: $recepcion->almacen_id,
                    materialId: $item['material_id'],
                    cantidad: (float) $item['cantidad'],
                    tipoMovimiento: 'salida_devolucion_proveedor',
                    documentoTipo: 'devolucion_proveedor',
                    documentoId: $devolucion->id,
                    usuarioId: $usuarioId,
                    observacion: 'Devolución a proveedor '.$validated['motivo']
                );
            }

            return $devolucion;
        });

        return response()->json([
            'success' => true,
            'message' => 'Devolución a proveedor registrada y stock actualizado exitosamente.',
            'data' => $devolucion->load(['detalles.material', 'proveedor']),
        ], 201);
    }
}
