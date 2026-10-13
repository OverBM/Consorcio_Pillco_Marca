<?php

namespace App\Http\Middleware;

use App\Models\Usuario;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resuelve la identidad de las peticiones a /api/v1 mediante corredor dual:
 * (a) token Bearer (remember_token) de consumidores externos/móvil, o
 * (b) la sesión web del panel (iniciada por StartSession).
 * No bloquea peticiones sin identidad: se conserva null para clientes anónimos.
 */
class ResolveApiUser
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if ($token) {
            $usuario = Usuario::query()
                ->where('remember_token', $token)
                ->first();

            if ($usuario) {
                Auth::guard('web')->setUser($usuario);
            }
        }

        return $next($request);
    }
}
