<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Inventario\StockService;
use App\Http\Controllers\Controller;
use App\Models\Merma;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MermaController extends Controller
{
    public function __construct(
        protected StockService $stockService
    ) {}

    /**
     * Listar registros de mermas y pérdidas.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Merma::with(['almacen.obra', 'material', 'registrador', 'aprobador'])
            ->orderBy('id', 'desc');

        if ($request->filled('almacen_id')) {
            $query->where('almacen_id', $request->input('almacen_id'));
        }

        $mermas = $query->paginate($request->integer('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $mermas->items(),
            'meta' => [
                'current_page' => $mermas->currentPage(),
                'last_page' => $mermas->lastPage(),
                'total' => $mermas->total(),
            ],
        ]);
    }

    /**
     * Registrar merma o material dañado con egreso automático en inventario.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'almacen_id' => 'required|exists:almacenes,id',
            'material_id' => 'required|exists:materiales,id',
            'lote_id' => 'nullable|exists:lotes,id',
            'transferencia_id' => 'nullable|exists:transferencias,id',
            'cantidad' => 'required|numeric|min:0.001',
            'causa' => 'required|string|max:25',
            'justificacion' => 'required|string',
        ]);

        $usuarioId = $request->user()?->id ?? 1;

        $merma = DB::transaction(function () use ($validated, $usuarioId) {
            $merma = Merma::create([
                'almacen_id' => $validated['almacen_id'],
                'material_id' => $validated['material_id'],
                'lote_id' => $validated['lote_id'] ?? null,
                'transferencia_id' => $validated['transferencia_id'] ?? null,
                'cantidad' => $validated['cantidad'],
                'causa' => $validated['causa'],
                'justificacion' => $validated['justificacion'],
                'estado' => 'aprobada',
                'registrada_por' => $usuarioId,
                'aprobada_por' => $usuarioId,
                'aprobada_en' => now(),
            ]);

            // Egresar de inventario y asentar en Kardex
            $this->stockService->egresarStock(
                almacenId: $validated['almacen_id'],
                materialId: $validated['material_id'],
                cantidad: (float) $validated['cantidad'],
                tipoMovimiento: 'salida_merma',
                documentoTipo: 'merma',
                documentoId: $merma->id,
                usuarioId: $usuarioId,
                observacion: 'Baja por merma: '.$validated['causa'].' - '.$validated['justificacion']
            );

            return $merma;
        });

        return response()->json([
            'success' => true,
            'message' => 'Merma registrada y stock ajustado en inventario.',
            'data' => $merma->load(['material', 'almacen']),
        ], 201);
    }
}
