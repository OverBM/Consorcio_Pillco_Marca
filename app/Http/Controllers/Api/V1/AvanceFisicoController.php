<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AvanceFisico;
use App\Models\Partida;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AvanceFisicoController extends Controller
{
    /**
     * Listar avances físicos de partidas por obra.
     */
    public function index(Request $request): JsonResponse
    {
        $query = AvanceFisico::with(['obra', 'partida', 'registrador'])
            ->orderBy('periodo', 'desc');

        if ($request->filled('obra_id')) {
            $query->where('obra_id', $request->input('obra_id'));
        }

        if ($request->filled('partida_id')) {
            $query->where('partida_id', $request->input('partida_id'));
        }

        $avances = $query->paginate($request->integer('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $avances->items(),
            'meta' => [
                'current_page' => $avances->currentPage(),
                'last_page' => $avances->lastPage(),
                'total' => $avances->total(),
            ],
        ]);
    }

    /**
     * Registrar avance físico de una partida contractual.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'obra_id' => 'required|exists:obras,id',
            'frente_id' => 'nullable|exists:frentes_trabajo,id',
            'partida_id' => 'required|exists:partidas,id',
            'periodo' => 'required|date',
            'metrado_ejecutado' => 'required|numeric|min:0.001',
            'avance_pct_acumulado' => 'required|numeric|min:0|max:100',
        ]);

        $usuarioId = $request->user()?->id ?? 1;

        $avance = DB::transaction(function () use ($validated, $usuarioId) {
            $avance = AvanceFisico::updateOrCreate(
                [
                    'partida_id' => $validated['partida_id'],
                    'periodo' => $validated['periodo'],
                ],
                [
                    'obra_id' => $validated['obra_id'],
                    'frente_id' => $validated['frente_id'] ?? null,
                    'metrado_ejecutado' => $validated['metrado_ejecutado'],
                    'avance_pct_acumulado' => $validated['avance_pct_acumulado'],
                    'registrado_por' => $usuarioId,
                ]
            );

            // Actualizar porcentaje de avance acumulado en la partida
            $partida = Partida::findOrFail($validated['partida_id']);
            $partida->update([
                'avance_pct' => $validated['avance_pct_acumulado'],
            ]);

            return $avance;
        });

        return response()->json([
            'success' => true,
            'message' => 'Avance físico registrado correctamente.',
            'data' => $avance->load(['partida', 'obra']),
        ], 201);
    }
}
