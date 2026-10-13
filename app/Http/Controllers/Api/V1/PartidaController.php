<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Partida;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PartidaController extends Controller
{
    /**
     * Listar partidas contractuales (EDT) filtradas por obra.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Partida::with('obra');

        if ($request->filled('obra_id')) {
            $query->where('obra_id', $request->input('obra_id'));
        }

        return response()->json([
            'success' => true,
            'data' => $query->orderBy('codigo')->get(),
        ]);
    }

    /**
     * Registrar una nueva partida contractual en la EDT de la obra.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'obra_id' => 'required|exists:obras,id',
            'frente_id' => 'nullable|exists:frentes,id',
            'codigo' => 'required|string|max:40',
            'descripcion' => 'required|string',
            'unidad' => 'required|string|max:20',
            'metrado' => 'required|numeric|min:0',
            'costo_unitario' => 'required|numeric|min:0',
            'avance_pct' => 'nullable|numeric|min:0|max:100',
            'fecha_inicio_prevista' => 'nullable|date',
            'fecha_fin_prevista' => 'nullable|date',
        ]);

        $partida = Partida::create([
            'obra_id' => $validated['obra_id'],
            'frente_id' => $validated['frente_id'] ?? null,
            'codigo' => $validated['codigo'],
            'descripcion' => $validated['descripcion'],
            'unidad' => $validated['unidad'],
            'metrado' => $validated['metrado'],
            'costo_unitario' => $validated['costo_unitario'],
            'avance_pct' => $validated['avance_pct'] ?? 0,
            'fecha_inicio_prevista' => $validated['fecha_inicio_prevista'] ?? null,
            'fecha_fin_prevista' => $validated['fecha_fin_prevista'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Partida registrada exitosamente.',
            'data' => $partida->load('obra'),
        ], 201);
    }
}
