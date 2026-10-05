<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Auditoria;
use App\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $usuario = Usuario::with(['roles.permisos', 'obras', 'almacenes'])
            ->where('email', $validated['email'])
            ->first();

        if (! $usuario || ! Hash::check($validated['password'], $usuario->password)) {
            if ($usuario) {
                $usuario->increment('intentos_fallidos');
            }

            return response()->json([
                'codigo' => 'CREDENCIALES_INVALIDAS',
                'mensaje' => 'Las credenciales proporcionadas son incorrectas.',
            ], 401);
        }

        if (! $usuario->activo) {
            return response()->json([
                'codigo' => 'USUARIO_INACTIVO',
                'mensaje' => 'Su cuenta se encuentra inactiva. Contacte al Administrador.',
            ], 403);
        }

        $usuario->update([
            'intentos_fallidos' => 0,
            'ultimo_acceso_en' => now(),
            'remember_token' => Str::random(60),
        ]);

        Auditoria::create([
            'usuario_id' => $usuario->id,
            'accion' => 'login',
            'entidad' => 'usuarios',
            'entidad_id' => $usuario->id,
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);

        $permisos = $usuario->roles
            ->flatMap(fn ($rol) => $rol->permisos)
            ->pluck('codigo')
            ->unique()
            ->values();

        return response()->json([
            'mensaje' => 'Inicio de sesión exitoso',
            'token' => $usuario->remember_token,
            'usuario' => [
                'id' => $usuario->id,
                'name' => $usuario->name,
                'email' => $usuario->email,
                'dni' => $usuario->dni,
                'roles' => $usuario->roles->map(fn ($r) => ['codigo' => $r->codigo, 'nombre' => $r->nombre]),
                'permisos' => $permisos,
                'obras' => $usuario->obras->map(fn ($o) => ['id' => $o->id, 'codigo' => $o->codigo, 'nombre' => $o->nombre]),
                'almacenes' => $usuario->almacenes->map(fn ($a) => ['id' => $a->id, 'codigo' => $a->codigo, 'nombre' => $a->nombre]),
            ],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $token = $request->bearerToken();
        if (! $token) {
            return response()->json(['codigo' => 'NO_AUTENTICADO', 'mensaje' => 'Token no proporcionado'], 401);
        }

        $usuario = Usuario::with(['roles.permisos', 'obras', 'almacenes'])
            ->where('remember_token', $token)
            ->first();

        if (! $usuario) {
            return response()->json(['codigo' => 'TOKEN_INVALIDO', 'mensaje' => 'Token inválido o expirado'], 401);
        }

        $permisos = $usuario->roles
            ->flatMap(fn ($rol) => $rol->permisos)
            ->pluck('codigo')
            ->unique()
            ->values();

        return response()->json([
            'usuario' => [
                'id' => $usuario->id,
                'name' => $usuario->name,
                'email' => $usuario->email,
                'dni' => $usuario->dni,
                'roles' => $usuario->roles->map(fn ($r) => ['codigo' => $r->codigo, 'nombre' => $r->nombre]),
                'permisos' => $permisos,
                'obras' => $usuario->obras->map(fn ($o) => ['id' => $o->id, 'codigo' => $o->codigo, 'nombre' => $o->nombre]),
                'almacenes' => $usuario->almacenes->map(fn ($a) => ['id' => $a->id, 'codigo' => $a->codigo, 'nombre' => $a->nombre]),
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $token = $request->bearerToken();
        if ($token) {
            Usuario::where('remember_token', $token)->update(['remember_token' => null]);
        }

        return response()->json(['mensaje' => 'Sesión cerrada exitosamente']);
    }
}
