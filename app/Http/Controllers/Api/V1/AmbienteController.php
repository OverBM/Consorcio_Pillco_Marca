<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\IndicadorAmbiental;
use App\Models\MedicionAmbiental;
use App\Models\Residuo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AmbienteController extends Controller
{
    /**
     * Listar mediciones ambientales realizadas en obra.
     */
    public function indexMediciones(Request $request): JsonResponse
    {
        $query = MedicionAmbiental::with(['obra', 'indicador'])->orderBy('medido_en', 'desc');

        if ($request->filled('obra_id')) {
            $query->where('obra_id', $request->input('obra_id'));
        }

        $mediciones = $query->paginate($request->integer('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $mediciones->items(),
            'meta' => [
                'current_page' => $mediciones->currentPage(),
                'last_page' => $mediciones->lastPage(),
                'total' => $mediciones->total(),
            ],
        ]);
    }

    /**
     * Registrar medición ambiental y verificar automáticamente si excede el límite máximo permisible (LMP).
     */
    public function storeMedicion(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'obra_id' => 'required|exists:obras,id',
            'indicador_id' => 'required|exists:indicadores_ambientales,id',
            'valor' => 'required|numeric|min:0',
            'medida_correctiva' => 'nullable|string',
        ]);

        $usuarioId = $request->user()?->id ?? 1;
        $indicador = IndicadorAmbiental::findOrFail($validated['indicador_id']);

        $fueraDeLimite = (float) $validated['valor'] > (float) $indicador->limite_maximo;

        $medicion = MedicionAmbiental::create([
            'obra_id' => $validated['obra_id'],
            'indicador_id' => $validated['indicador_id'],
            'valor' => $validated['valor'],
            'fuera_de_limite' => $fueraDeLimite,
            'medida_correctiva' => $validated['medida_correctiva'] ?? null,
            'medido_por' => $usuarioId,
            'medido_en' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => $fueraDeLimite
                ? 'Medición registrada. ¡ALERTA: Supera el Límite Máximo Permisible!'
                : 'Medición registrada dentro de los parámetros ambientales permitidos.',
            'data' => $medicion->load(['obra', 'indicador']),
        ], 201);
    }

    /**
     * Listar inventario de residuos y excedentes reutilizables.
     */
    public function indexResiduos(Request $request): JsonResponse
    {
        $query = Residuo::with(['obra', 'almacen', 'material', 'eors'])->orderBy('id', 'desc');

        if ($request->filled('obra_id')) {
            $query->where('obra_id', $request->input('obra_id'));
        }

        $residuos = $query->paginate($request->integer('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $residuos->items(),
            'meta' => [
                'current_page' => $residuos->currentPage(),
                'last_page' => $residuos->lastPage(),
                'total' => $residuos->total(),
            ],
        ]);
    }

    /**
     * Registrar residuo de obra (desmonte, excedente no peligroso o peligroso).
     */
    public function storeResiduo(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'obra_id' => 'required|exists:obras,id',
            'almacen_id' => 'required|exists:almacenes,id',
            'clase' => 'required|string|in:no_peligroso,peligroso,reutilizable',
            'descripcion' => 'required|string|max:200',
            'material_id' => 'nullable|exists:materiales,id',
            'volumen' => 'required|numeric|min:0.001',
            'unidad' => 'required|string|max:10',
            'destino' => 'nullable|string|max:15',
            'eors_id' => 'nullable|exists:empresas_eors,id',
        ]);

        $usuarioId = $request->user()?->id ?? 1;

        $residuo = Residuo::create(array_merge($validated, [
            'registrado_por' => $usuarioId,
            'estado' => 'registrado',
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Residuo o material reutilizable registrado.',
            'data' => $residuo->load(['obra', 'almacen', 'material', 'eors']),
        ], 201);
    }
}
