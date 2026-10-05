<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Inventario\KardexService;
use App\Domain\Inventario\StockService;
use App\Http\Controllers\Controller;
use App\Models\Recepcion;
use App\Models\RecepcionDetalle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RecepcionController extends Controller
{
    public function __construct(
        protected StockService $stockService,
        protected KardexService $kardexService,
    ) {}

    /**
     * Listar recepciones de materiales.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Recepcion::with(['almacen.obra', 'ordenCompra', 'almacenero', 'detalles.material'])
            ->orderBy('id', 'desc');

        if ($request->filled('almacen_id')) {
            $query->where('almacen_id', $request->input('almacen_id'));
        }

        if ($request->filled('estado')) {
            $query->where('estado', $request->input('estado'));
        }

        $recepciones = $query->paginate($request->integer('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $recepciones->items(),
            'meta' => [
                'current_page' => $recepciones->currentPage(),
                'last_page' => $recepciones->lastPage(),
                'total' => $recepciones->total(),
            ],
        ]);
    }

    /**
     * Registrar recepción física e-POD y aumentar existencias en inventario.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'almacen_id' => 'required|exists:almacenes,id',
            'orden_compra_id' => 'required|exists:ordenes_compra,id',
            'guia_remision' => 'nullable|string|max:40',
            'firma_ruta' => 'nullable|string',
            'foto_ruta' => 'nullable|string',
            'observaciones' => 'nullable|string',
            'latitud' => 'nullable|numeric',
            'longitud' => 'nullable|numeric',
            'detalles' => 'required|array|min:1',
            'detalles.*.orden_compra_detalle_id' => 'required|integer',
            'detalles.*.material_id' => 'required|exists:materiales,id',
            'detalles.*.cantidad_ordenada' => 'required|numeric|min:0.001',
            'detalles.*.cantidad_recibida' => 'required|numeric|min:0',
            'detalles.*.cumple_especificaciones' => 'nullable|boolean',
            'detalles.*.motivo_rechazo' => 'nullable|string',
        ]);

        $usuarioId = $request->user()?->id ?? 1;

        $recepcion = DB::transaction(function () use ($validated, $usuarioId) {
            $codigo = 'REC-CPM-'.date('Ymd').'-'.strtoupper(Str::random(4));

            $recepcion = Recepcion::create([
                'codigo' => $codigo,
                'almacen_id' => $validated['almacen_id'],
                'orden_compra_id' => $validated['orden_compra_id'],
                'almacenero_id' => $usuarioId,
                'guia_remision' => $validated['guia_remision'] ?? null,
                'estado' => 'conforme',
                'recibida_en' => now(),
                'firma_ruta' => $validated['firma_ruta'] ?? null,
                'foto_ruta' => $validated['foto_ruta'] ?? null,
                'observaciones' => $validated['observaciones'] ?? null,
            ]);

            foreach ($validated['detalles'] as $item) {
                RecepcionDetalle::create([
                    'recepcion_id' => $recepcion->id,
                    'orden_compra_detalle_id' => $item['orden_compra_detalle_id'],
                    'material_id' => $item['material_id'],
                    'cantidad_ordenada' => $item['cantidad_ordenada'],
                    'cantidad_recibida' => $item['cantidad_recibida'],
                    'cumple_especificaciones' => $item['cumple_especificaciones'] ?? true,
                    'motivo_rechazo' => $item['motivo_rechazo'] ?? null,
                ]);

                // Incrementar inventario y asentar en Kardex si la cantidad recibida > 0
                if ($item['cantidad_recibida'] > 0) {
                    $this->stockService->ingresarStock(
                        almacenId: $validated['almacen_id'],
                        materialId: $item['material_id'],
                        cantidad: (float) $item['cantidad_recibida'],
                        tipoMovimiento: 'ingreso_recepcion',
                        documentoTipo: 'recepcion',
                        documentoId: $recepcion->id,
                        usuarioId: $usuarioId,
                        observacion: 'Recepción e-POD OC #'.$validated['orden_compra_id'].' '.($validated['guia_remision'] ?? '')
                    );
                }
            }

            return $recepcion;
        });

        return response()->json([
            'success' => true,
            'message' => 'Recepción registrada conforme y stock actualizado exitosamente.',
            'data' => $recepcion->load(['detalles.material', 'almacen', 'ordenCompra']),
        ], 201);
    }

    /**
     * Ver detalle de una recepción.
     */
    public function show(int $id): JsonResponse
    {
        $recepcion = Recepcion::with(['almacen.obra', 'ordenCompra.proveedor', 'almacenero', 'detalles.material'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $recepcion,
        ]);
    }
}
