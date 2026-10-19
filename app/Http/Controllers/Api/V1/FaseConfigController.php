<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\FaseCicloVida;
use App\Http\Controllers\Controller;
use App\Models\FaseCriterio;
use App\Models\FaseRequisito;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Catálogo administrable de requisitos y criterios de aprobación por fase.
 */
class FaseConfigController extends Controller
{
    public function index(): JsonResponse
    {
        $requisitos = FaseRequisito::query()->orderBy('fase')->orderBy('orden')->get();
        $criterios = FaseCriterio::query()->orderBy('fase')->orderBy('orden')->get();

        return response()->json([
            'success' => true,
            'data' => [
                'fases' => collect(FaseCicloVida::secuencia())->map(fn (array $fase) => [
                    ...$fase,
                    'requisitos' => $requisitos->where('fase', $fase['codigo'])->values(),
                    'criterios' => $criterios->where('fase', $fase['codigo'])->values(),
                ])->all(),
                'tipos_criterio' => FaseCriterio::tiposSoportados(),
            ],
        ]);
    }

    public function storeRequisito(Request $request): JsonResponse
    {
        $validated = $this->validarRequisito($request);

        $requisito = FaseRequisito::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Requisito registrado exitosamente.',
            'data' => $requisito,
        ], 201);
    }

    public function updateRequisito(Request $request, FaseRequisito $requisito): JsonResponse
    {
        $requisito->update($this->validarRequisito($request, $requisito));

        return response()->json([
            'success' => true,
            'message' => 'Requisito actualizado exitosamente.',
            'data' => $requisito->fresh(),
        ]);
    }

    public function destroyRequisito(FaseRequisito $requisito): JsonResponse
    {
        $requisito->delete();

        return response()->json([
            'success' => true,
            'message' => 'Requisito eliminado exitosamente.',
        ]);
    }

    public function storeCriterio(Request $request): JsonResponse
    {
        $validated = $this->validarCriterio($request);

        $criterio = FaseCriterio::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Criterio registrado exitosamente.',
            'data' => $criterio,
        ], 201);
    }

    public function updateCriterio(Request $request, FaseCriterio $criterio): JsonResponse
    {
        $criterio->update($this->validarCriterio($request, $criterio));

        return response()->json([
            'success' => true,
            'message' => 'Criterio actualizado exitosamente.',
            'data' => $criterio->fresh(),
        ]);
    }

    public function destroyCriterio(FaseCriterio $criterio): JsonResponse
    {
        $criterio->delete();

        return response()->json([
            'success' => true,
            'message' => 'Criterio eliminado exitosamente.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validarRequisito(Request $request, ?FaseRequisito $requisito = null): array
    {
        return $request->validate([
            'fase' => ['required', 'string', Rule::in(FaseCicloVida::valores())],
            'codigo' => [
                'required',
                'string',
                'max:60',
                Rule::unique('fase_requisitos', 'codigo')
                    ->where('fase', $request->input('fase'))
                    ->ignore($requisito?->id),
            ],
            'nombre' => ['required', 'string', 'max:160'],
            'descripcion' => ['nullable', 'string', 'max:1000'],
            'orden' => ['nullable', 'integer', 'min:0'],
            'activo' => ['nullable', 'boolean'],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validarCriterio(Request $request, ?FaseCriterio $criterio = null): array
    {
        return $request->validate([
            'fase' => ['required', 'string', Rule::in(FaseCicloVida::valores())],
            'codigo' => [
                'required',
                'string',
                'max:60',
                Rule::unique('fase_criterios', 'codigo')
                    ->where('fase', $request->input('fase'))
                    ->ignore($criterio?->id),
            ],
            'nombre' => ['required', 'string', 'max:160'],
            'tipo' => ['required', 'string', Rule::in(FaseCriterio::tiposSoportados())],
            'parametros' => ['nullable', 'array'],
            'umbral' => ['nullable', 'numeric'],
            'obligatorio' => ['nullable', 'boolean'],
            'orden' => ['nullable', 'integer', 'min:0'],
            'activo' => ['nullable', 'boolean'],
        ]);
    }
}
