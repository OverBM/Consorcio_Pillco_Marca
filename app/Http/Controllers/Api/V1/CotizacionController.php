<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Cotizacion;
use App\Models\CotizacionDetalle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CotizacionController extends Controller
{
    /**
     * Listar cotizaciones con comparativa para un requerimiento.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Cotizacion::with(['proveedor', 'requerimiento.obra', 'detalles.material'])
            ->orderBy('id', 'desc');

        if ($request->filled('requerimiento_id')) {
            $query->where('requerimiento_id', $request->input('requerimiento_id'));
        }

        $cotizaciones = $query->get();

        return response()->json([
            'success' => true,
            'data' => $cotizaciones,
        ]);
    }

    /**
     * Registrar oferta de cotización de un proveedor.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'requerimiento_id' => 'required|exists:requerimientos,id',
            'proveedor_id' => 'required|exists:proveedores,id',
            'plazo_entrega_dias' => 'nullable|integer|min:1',
            'condiciones' => 'nullable|string',
            'detalles' => 'required|array|min:1',
            'detalles.*.material_id' => 'required|exists:materiales,id',
            'detalles.*.cantidad' => 'required|numeric|min:0.001',
            'detalles.*.precio_unitario' => 'required|numeric|min:0',
        ]);

        $cotizacion = DB::transaction(function () use ($validated) {
            $total = 0;
            foreach ($validated['detalles'] as $item) {
                $total += ((float) $item['cantidad'] * (float) $item['precio_unitario']);
            }

            $cotizacion = Cotizacion::create([
                'requerimiento_id' => $validated['requerimiento_id'],
                'proveedor_id' => $validated['proveedor_id'],
                'total' => $total,
                'plazo_entrega_dias' => $validated['plazo_entrega_dias'] ?? 7,
                'condiciones' => $validated['condiciones'] ?? null,
                'estado' => 'recibida',
            ]);

            foreach ($validated['detalles'] as $item) {
                CotizacionDetalle::create([
                    'cotizacion_id' => $cotizacion->id,
                    'material_id' => $item['material_id'],
                    'cantidad' => $item['cantidad'],
                    'precio_unitario' => $item['precio_unitario'],
                ]);
            }

            return $cotizacion;
        });

        return response()->json([
            'success' => true,
            'message' => 'Cotización registrada exitosamente.',
            'data' => $cotizacion->load(['proveedor', 'detalles.material']),
        ], 201);
    }

    /**
     * Seleccionar cotización ganadora del cuadro comparativo.
     */
    public function seleccionar(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'motivo_seleccion' => 'required|string',
        ]);

        $cotizacion = Cotizacion::findOrFail($id);

        DB::transaction(function () use ($cotizacion, $validated) {
            // Marcar las otras cotizaciones del mismo requerimiento como rechazadas
            Cotizacion::where('requerimiento_id', $cotizacion->requerimiento_id)
                ->where('id', '!=', $cotizacion->id)
                ->update(['estado' => 'rechazada']);

            $cotizacion->update([
                'estado' => 'seleccionada',
                'motivo_seleccion' => $validated['motivo_seleccion'],
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Cotización seleccionada como ganadora del cuadro comparativo.',
            'data' => $cotizacion->fresh(),
        ]);
    }
}
