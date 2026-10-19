<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Usuario;
use App\Support\PasswordPolicy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Perfil del usuario autenticado: datos personales, contacto y contraseña.
 *
 * El nombre y el teléfono son editables por el propio usuario; el correo,
 * el DNI y el rol quedan en modo solo lectura (los gestiona un administrador).
 */
class PerfilController extends Controller
{
    public function show(Request $request): Response
    {
        return Inertia::render('PerfilPage', [
            'perfil' => $this->payload($request->user()),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'telefono' => ['nullable', 'string', 'max:30'],
        ]);

        $request->user()->update($datos);

        return response()->json([
            'success' => true,
            'message' => 'Tus datos fueron actualizados.',
        ]);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'confirmed', new PasswordPolicy],
        ]);

        $usuario = $request->user();

        if (! Hash::check($request->current_password, $usuario->password)) {
            throw ValidationException::withMessages([
                'current_password' => 'La contraseña actual no es correcta.',
            ]);
        }

        $usuario->update(['password' => $request->password]);

        return response()->json([
            'success' => true,
            'message' => 'Tu contraseña fue actualizada.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(Usuario $usuario): array
    {
        $usuario->loadMissing(['roles', 'obras', 'almacenes']);

        return [
            'id' => $usuario->id,
            'name' => $usuario->name,
            'email' => $usuario->email,
            'dni' => $usuario->dni,
            'telefono' => $usuario->telefono,
            'roles' => $usuario->roles
                ->map(fn ($rol) => ['codigo' => $rol->codigo, 'nombre' => $rol->nombre])
                ->values(),
            'obras' => $usuario->obras
                ->map(fn ($obra) => ['id' => $obra->id, 'codigo' => $obra->codigo, 'nombre' => $obra->nombre])
                ->values(),
            'almacenes' => $usuario->almacenes
                ->map(fn ($almacen) => ['id' => $almacen->id, 'codigo' => $almacen->codigo, 'nombre' => $almacen->nombre])
                ->values(),
        ];
    }
}
