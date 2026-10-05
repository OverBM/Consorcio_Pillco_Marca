<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Riesgo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RiesgoController extends Controller
{
    /**
     * Listar matriz de riesgos del proyecto.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Riesgo::with(['obra', 'responsable'])
            ->orderBy('severidad', 'desc');

        if ($request->filled('obra_id')) {
            $query->where('obra_id', $request->input('obra_id'));
        }

        if ($request->filled('estado')) {
            $query->where('estado', $request->input('estado'));
        }

        $riesgos = $query->paginate($request->integer('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $riesgos->items(),
            'meta' => [
                'current_page' => $riesgos->currentPage(),
                'last_page' => $riesgos->lastPage(),
                'total' => $riesgos->total(),
            ],
        ]);
    }

    /**
     * Registrar nuevo riesgo en la matriz PMI.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'obra_id' => 'required|exists:obras,id',
            'descripcion' => 'required|string',
            'categoria' => 'required|string|max:20',
            'probabilidad' => 'required|integer|min:1|max:5',
            'impacto' => 'required|integer|min:1|max:5',
            'respuesta' => 'nullable|string',
            'responsable_id' => 'nullable|exists:usuarios,id',
        ]);

        $severidad = (int) $validated['probabilidad'] * (int) $validated['impacto'];

        $riesgo = Riesgo::create([
            'obra_id' => $validated['obra_id'],
            'descripcion' => $validated['descripcion'],
            'categoria' => $validated['categoria'],
            'probabilidad' => $validated['probabilidad'],
            'impacto' => $validated['impacto'],
            'severidad' => $severidad,
            'respuesta' => $validated['respuesta'] ?? null,
            'responsable_id' => $validated['responsable_id'] ?? null,
            'estado' => 'abierto',
            'origen' => 'manual',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Riesgo registrado en la matriz PMI.',
            'data' => $riesgo->load('obra'),
        ], 201);
    }

    /**
     * Actualizar plan de respuesta o estado del riesgo.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $riesgo = Riesgo::findOrFail($id);

        $validated = $request->validate([
            'respuesta' => 'nullable|string',
            'estado' => 'nullable|string|in:abierto,mitigado,cerrado,materializado',
            'probabilidad' => 'nullable|integer|min:1|max:5',
            'impacto' => 'nullable|integer|min:1|max:5',
        ]);

        if (isset($validated['probabilidad']) || isset($validated['impacto'])) {
            $prob = $validated['probabilidad'] ?? $riesgo->probabilidad;
            $imp = $validated['impacto'] ?? $riesgo->impacto;
            $validated['severidad'] = $prob * $imp;
        }

        $riesgo->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Riesgo actualizado correctamente.',
            'data' => $riesgo->fresh(),
        ]);
    }
}
