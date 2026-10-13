<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Rol;
use App\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UsuarioController extends Controller
{
    /**
     * Listar usuarios con sus roles y obras asignadas.
     */
    public function index(Request $request): JsonResponse
    {
        $usuarios = Usuario::with(['roles:id,codigo,nombre', 'obras:id,nombre'])
            ->orderBy('name')
            ->get()
            ->map(fn (Usuario $usuario) => $this->payload($usuario));

        return response()->json([
            'success' => true,
            'data' => $usuarios,
        ]);
    }

    /**
     * Registrar un usuario nuevo y asignarle su rol y alcance.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'email' => 'required|email|max:160|unique:usuarios,email',
            'password' => 'required|string|min:8',
            'dni' => 'nullable|string|max:12|unique:usuarios,dni',
            'telefono' => 'nullable|string|max:30',
            'rol_codigo' => 'required|string|exists:roles,codigo',
            'obra_id' => 'nullable|exists:obras,id',
            'activo' => 'boolean',
        ]);

        $usuario = Usuario::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'dni' => $validated['dni'] ?? null,
            'telefono' => $validated['telefono'] ?? null,
            'activo' => $validated['activo'] ?? true,
        ]);

        $this->asignarRolYAlcance($usuario, $validated['rol_codigo'], $validated['obra_id'] ?? null);

        return response()->json([
            'success' => true,
            'message' => 'Usuario registrado exitosamente.',
            'data' => $this->payload($usuario->load(['roles', 'obras'])),
        ], 201);
    }

    /**
     * Actualizar credenciales, rol, alcance o estado de un usuario.
     */
    public function update(Request $request, Usuario $usuario): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:150',
            'email' => [
                'sometimes',
                'required',
                'email',
                'max:160',
                Rule::unique('usuarios', 'email')->ignore($usuario->id),
            ],
            'password' => 'sometimes|nullable|string|min:8',
            'dni' => [
                'sometimes',
                'nullable',
                'string',
                'max:12',
                Rule::unique('usuarios', 'dni')->ignore($usuario->id),
            ],
            'telefono' => 'sometimes|nullable|string|max:30',
            'rol_codigo' => 'sometimes|nullable|string|exists:roles,codigo',
            'obra_id' => 'sometimes|nullable|exists:obras,id',
            'activo' => 'sometimes|boolean',
        ]);

        $usuario->fill(collect($validated)->only(['name', 'email', 'dni', 'telefono', 'activo'])->all());

        if (! empty($validated['password'])) {
            $usuario->password = $validated['password'];
        }

        $usuario->save();

        if (! empty($validated['rol_codigo'])) {
            $this->asignarRolYAlcance(
                $usuario,
                $validated['rol_codigo'],
                $request->input('obra_id')
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Usuario actualizado exitosamente.',
            'data' => $this->payload($usuario->load(['roles', 'obras'])),
        ]);
    }

    /**
     * Sincronizar el rol del sistema y el alcance de obra del usuario.
     */
    private function asignarRolYAlcance(Usuario $usuario, string $rolCodigo, int|string|null $obraId): void
    {
        $rol = Rol::where('codigo', $rolCodigo)->firstOrFail();

        $usuario->roles()->sync([$rol->id]);

        if ($obraId) {
            $usuario->obras()->sync([$obraId => ['rol_id' => $rol->id]]);
        } else {
            $usuario->obras()->sync([]);
        }
    }

    /**
     * Normalizar la representación del usuario para la API.
     *
     * @return array<string, mixed>
     */
    private function payload(Usuario $usuario): array
    {
        return [
            'id' => $usuario->id,
            'name' => $usuario->name ?? $usuario->email,
            'email' => $usuario->email,
            'dni' => $usuario->dni,
            'telefono' => $usuario->telefono,
            'activo' => (bool) $usuario->activo,
            'roles' => $usuario->roles
                ->map(fn (Rol $rol) => ['codigo' => $rol->codigo, 'nombre' => $rol->nombre])
                ->values()
                ->all(),
            'obras' => $usuario->obras
                ->map(fn ($obra) => ['id' => $obra->id, 'nombre' => $obra->nombre])
                ->values()
                ->all(),
        ];
    }
}
