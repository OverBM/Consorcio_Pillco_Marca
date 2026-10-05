<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\OrdenCompra;
use App\Models\OrdenCompraDetalle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrdenCompraController extends Controller
{
    /**
     * Listar órdenes de compra emitidas.
     */
    public function index(Request $request): JsonResponse
    {
        $query = OrdenCompra::with(['obra', 'almacenDestino', 'proveedor', 'emitente', 'recepciones'])
            ->orderBy('id', 'desc');

        if ($request->filled('obra_id')) {
            $query->where('obra_id', $request->input('obra_id'));
        }

        if ($request->filled('estado')) {
            $query->where('estado', $request->input('estado'));
        }

        $ordenes = $query->paginate($request->integer('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $ordenes->items(),
            'meta' => [
                'current_page' => $ordenes->currentPage(),
                'last_page' => $ordenes->lastPage(),
                'total' => $ordenes->total(),
            ],
        ]);
    }

    /**
     * Generar orden de compra a partir de una cotización seleccionada o requerimiento.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cotizacion_id' => 'nullable|exists:cotizaciones,id',
            'requerimiento_id' => 'nullable|exists:requerimientos,id',
            'proveedor_id' => 'required|exists:proveedores,id',
            'obra_id' => 'required|exists:obras,id',
            'almacen_destino_id' => 'required|exists:almacenes,id',
            'urgente' => 'nullable|boolean',
            'fecha_entrega_prometida' => 'nullable|date',
            'detalles' => 'required|array|min:1',
            'detalles.*.material_id' => 'required|exists:materiales,id',
            'detalles.*.cantidad' => 'required|numeric|min:0.001',
            'detalles.*.precio_unitario' => 'required|numeric|min:0',
            'detalles.*.especificaciones_tecnicas' => 'nullable|array',
        ]);

        $usuarioId = $request->user()?->id ?? 1;

        $oc = DB::transaction(function () use ($validated, $usuarioId) {
            $codigo = 'OC-'.date('Y').'-'.strtoupper(Str::random(5));
            $total = 0;

            foreach ($validated['detalles'] as $item) {
                $total += ((float) $item['cantidad'] * (float) $item['precio_unitario']);
            }

            $oc = OrdenCompra::create([
                'codigo' => $codigo,
                'requerimiento_id' => $validated['requerimiento_id'] ?? null,
                'cotizacion_id' => $validated['cotizacion_id'] ?? null,
                'proveedor_id' => $validated['proveedor_id'],
                'obra_id' => $validated['obra_id'],
                'almacen_destino_id' => $validated['almacen_destino_id'],
                'urgente' => $validated['urgente'] ?? false,
                'estado' => 'emitida',
                'total' => $total,
                'emitida_por' => $usuarioId,
                'fecha_entrega_prometida' => $validated['fecha_entrega_prometida'] ?? null,
            ]);

            foreach ($validated['detalles'] as $item) {
                OrdenCompraDetalle::create([
                    'orden_compra_id' => $oc->id,
                    'material_id' => $item['material_id'],
                    'cantidad' => $item['cantidad'],
                    'precio_unitario' => $item['precio_unitario'],
                    'especificaciones_tecnicas' => $item['especificaciones_tecnicas'] ?? [],
                ]);
            }

            return $oc;
        });

        return response()->json([
            'success' => true,
            'message' => 'Orden de compra emitida exitosamente.',
            'data' => $oc->load(['proveedor', 'obra', 'almacenDestino']),
        ], 201);
    }
}
