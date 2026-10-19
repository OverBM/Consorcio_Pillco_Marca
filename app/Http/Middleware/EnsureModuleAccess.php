<?php

namespace App\Http\Middleware;

use App\Models\Usuario;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Autoriza el acceso a un módulo a partir del catálogo de permisos del usuario.
 *
 * Uso: `->middleware('modulo:pmi')` exige `pmi.ver`;
 *      `->middleware('modulo:pmi,editar')` exige `pmi.editar`.
 */
class EnsureModuleAccess
{
    public function handle(Request $request, Closure $next, string $modulo, string $nivel = 'ver'): Response
    {
        $usuario = $request->user();
        $permiso = "{$modulo}.{$nivel}";

        if (! $usuario instanceof Usuario || ! $usuario->tienePermiso($permiso)) {
            abort(403, 'No tiene acceso a este módulo.');
        }

        return $next($request);
    }
}
