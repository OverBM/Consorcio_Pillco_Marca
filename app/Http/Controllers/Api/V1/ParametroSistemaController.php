<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ParametroSistema;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ParametroSistemaController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => ParametroSistema::query()->orderBy('clave')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validar($request);

        $parametro = ParametroSistema::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Parámetro registrado exitosamente.',
            'data' => $parametro,
        ], 201);
    }

    public function update(Request $request, ParametroSistema $parametro): JsonResponse
    {
        $validated = $this->validar($request, $parametro);

        $parametro->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Parámetro actualizado exitosamente.',
            'data' => $parametro->fresh(),
        ]);
    }

    public function destroy(ParametroSistema $parametro): JsonResponse
    {
        $parametro->delete();

        return response()->json([
            'success' => true,
            'message' => 'Parámetro eliminado exitosamente.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validar(Request $request, ?ParametroSistema $parametro = null): array
    {
        return $request->validate([
            'clave' => [
                'required',
                'string',
                'max:80',
                Rule::unique('parametros_sistema', 'clave')->ignore($parametro?->id),
            ],
            'valor' => ['required', 'string'],
            'tipo' => ['required', 'string', Rule::in(['texto', 'numero', 'booleano', 'json'])],
            'descripcion' => ['nullable', 'string', 'max:1000'],
        ]);
    }
}
