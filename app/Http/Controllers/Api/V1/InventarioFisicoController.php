<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Inventario\StockService;
use App\Http\Controllers\Controller;
use App\Models\InventarioFisico;
use App\Models\InventarioFisicoDetalle;
use App\Models\StockAlmacen;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventarioFisicoController extends Controller
{
    public function __construct(
        protected StockService $stockService
    ) {}

    /**
     * Listar inventarios físicos programados o cerrados.
     */
    public function index(Request $request): JsonResponse
    {
        $query = InventarioFisico::with(['almacen.obra', 'programador', 'detalles.material'])
            ->orderBy('id', 'desc');

        if ($request->filled('almacen_id')) {
            $query->where('almacen_id', $request->input('almacen_id'));
        }

        $inventarios = $query->paginate($request->integer('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $inventarios->items(),
            'meta' => [
                'current_page' => $inventarios->currentPage(),
                'last_page' => $inventarios->lastPage(),
                'total' => $inventarios->total(),
            ],
        ]);
    }

    /**
     * Programar nuevo inventario físico a ciegas para un almacén.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'almacen_id' => 'required|exists:almacenes,id',
            'periodo' => 'required|string|max:20',
            'tolerancia_pct' => 'nullable|numeric|min:0|max:100',
        ]);

        $usuarioId = $request->user()?->id ?? 1;

        $inventario = DB::transaction(function () use ($validated, $usuarioId) {
            $inventario = InventarioFisico::create([
                'almacen_id' => $validated['almacen_id'],
                'periodo' => $validated['periodo'],
                'estado' => 'en_conteo',
                'ciego' => true,
                'tolerancia_pct' => $validated['tolerancia_pct'] ?? 1.0,
                'programado_por' => $usuarioId,
            ]);

            // Cargar todos los materiales existentes en el almacén con su saldo actual
            $stocks = StockAlmacen::where('almacen_id', $validated['almacen_id'])->get();

            foreach ($stocks as $st) {
                InventarioFisicoDetalle::create([
                    'inventario_id' => $inventario->id,
                    'material_id' => $st->material_id,
                    'cantidad_sistema' => $st->cantidad,
                    'cantidad_contada' => null,
                ]);
            }

            return $inventario;
        });

        return response()->json([
            'success' => true,
            'message' => 'Inventario físico a ciegas programado exitosamente.',
            'data' => $inventario->load(['detalles.material', 'almacen']),
        ], 201);
    }

    /**
     * Registrar conteos y ajustar diferencias automáticamente en Kardex y stock.
     */
    public function registrarConteosYAjustar(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'conteos' => 'required|array|min:1',
            'conteos.*.id' => 'required|exists:inventario_fisico_detalles,id',
            'conteos.*.cantidad_contada' => 'required|numeric|min:0',
            'conteos.*.justificacion' => 'nullable|string',
        ]);

        $inventario = InventarioFisico::with('detalles')->findOrFail($id);
        $usuarioId = $request->user()?->id ?? 1;

        DB::transaction(function () use ($inventario, $validated, $usuarioId) {
            foreach ($validated['conteos'] as $conteo) {
                $det = InventarioFisicoDetalle::findOrFail($conteo['id']);
                $cantContada = (float) $conteo['cantidad_contada'];
                $cantSistema = (float) $det->cantidad_sistema;
                $diferencia = $cantContada - $cantSistema;

                $det->update([
                    'cantidad_contada' => $cantContada,
                    'justificacion' => $conteo['justificacion'] ?? null,
                    'ajuste_aprobado' => true,
                    'ajuste_aprobado_por' => $usuarioId,
                ]);

                // Si hay diferencia, ajustar inventario
                if ($diferencia > 0) {
                    // Sobrante -> Ingresar a stock
                    $this->stockService->ingresarStock(
                        almacenId: $inventario->almacen_id,
                        materialId: $det->material_id,
                        cantidad: $diferencia,
                        tipoMovimiento: 'ajuste_inventario_sobrante',
                        documentoTipo: 'inventario_fisico',
                        documentoId: $inventario->id,
                        usuarioId: $usuarioId,
                        observacion: 'Ajuste sobrante toma física '.$inventario->periodo
                    );
                } elseif ($diferencia < 0) {
                    // Faltante -> Egresar de stock
                    $this->stockService->egresarStock(
                        almacenId: $inventario->almacen_id,
                        materialId: $det->material_id,
                        cantidad: abs($diferencia),
                        tipoMovimiento: 'ajuste_inventario_faltante',
                        documentoTipo: 'inventario_fisico',
                        documentoId: $inventario->id,
                        usuarioId: $usuarioId,
                        observacion: 'Ajuste faltante toma física '.$inventario->periodo
                    );
                }
            }

            $inventario->update([
                'estado' => 'cerrado',
                'cerrado_por' => $usuarioId,
                'cerrado_en' => now(),
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Conteos registrados y ajustes de inventario aplicados exitosamente.',
            'data' => $inventario->fresh()->load('detalles.material'),
        ]);
    }
}
