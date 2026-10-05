<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Kardex;
use App\Models\StockAlmacen;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockController extends Controller
{
    /**
     * Listar existencias físicas con filtros por almacén y material.
     */
    public function index(Request $request): JsonResponse
    {
        $query = StockAlmacen::with(['almacen.obra', 'material.categoria', 'material.unidadMedida']);

        if ($request->filled('almacen_id')) {
            $query->where('almacen_id', $request->input('almacen_id'));
        }

        if ($request->filled('material_id')) {
            $query->where('material_id', $request->input('material_id'));
        }

        if ($request->filled('obra_id')) {
            $query->whereHas('almacen', function ($q) use ($request) {
                $q->where('obra_id', $request->input('obra_id'));
            });
        }

        if ($request->boolean('solo_critico')) {
            $query->whereRaw('(cantidad - cantidad_reservada) <= stock_minimo');
        }

        $stock = $query->paginate($request->integer('per_page', 25));

        return response()->json([
            'success' => true,
            'data' => $stock->items(),
            'meta' => [
                'current_page' => $stock->currentPage(),
                'last_page' => $stock->lastPage(),
                'total' => $stock->total(),
                'per_page' => $stock->perPage(),
            ],
        ]);
    }

    /**
     * Consultar materiales en stock crítico (bajo el stock mínimo).
     */
    public function critico(Request $request): JsonResponse
    {
        $criticos = DB::table('stock_almacen as sa')
            ->join('almacenes as a', 'a.id', '=', 'sa.almacen_id')
            ->join('obras as o', 'o.id', '=', 'a.obra_id')
            ->join('materiales as m', 'm.id', '=', 'sa.material_id')
            ->whereRaw('(sa.cantidad - sa.cantidad_reservada) <= sa.stock_minimo')
            ->select([
                'sa.id as stock_id',
                'o.id as obra_id',
                'o.nombre as obra_nombre',
                'a.id as almacen_id',
                'a.nombre as almacen_nombre',
                'm.id as material_id',
                'm.codigo as material_codigo',
                'm.nombre as material_nombre',
                'm.criticidad',
                'sa.cantidad',
                'sa.cantidad_reservada',
                DB::raw('(sa.cantidad - sa.cantidad_reservada) as cantidad_disponible'),
                'sa.stock_minimo',
                'sa.stock_seguridad',
                DB::raw('(sa.stock_minimo - (sa.cantidad - sa.cantidad_reservada)) as deficit'),
            ])
            ->orderBy('m.criticidad', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $criticos,
            'total_criticos' => $criticos->count(),
        ]);
    }

    /**
     * Consultar historial de Kardex inmutable para un almacén.
     */
    public function kardex(Request $request, int $almacenId): JsonResponse
    {
        $query = Kardex::with(['material', 'usuario'])
            ->where('almacen_id', $almacenId)
            ->orderBy('id', 'desc');

        if ($request->filled('material_id')) {
            $query->where('material_id', $request->input('material_id'));
        }

        if ($request->filled('tipo_movimiento')) {
            $query->where('tipo_movimiento', $request->input('tipo_movimiento'));
        }

        $movimientos = $query->paginate($request->integer('per_page', 50));

        return response()->json([
            'success' => true,
            'data' => $movimientos->items(),
            'meta' => [
                'current_page' => $movimientos->currentPage(),
                'last_page' => $movimientos->lastPage(),
                'total' => $movimientos->total(),
            ],
        ]);
    }
}
