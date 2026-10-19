<?php

namespace App\Http\Middleware;

use App\Models\Almacen;
use App\Models\Material;
use App\Models\Obra;
use App\Models\Usuario;
use App\Support\NotificacionesFeed;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => fn () => $this->usuarioPayload($request),
            ],
            'notificacionesFeed' => fn () => $this->notificacionesPayload($request),
            'contexto' => [
                'obra_activa_id' => $request->session()->get('obra_activa_id'),
                'almacen_activo_id' => $request->session()->get('almacen_activo_id'),
            ],
            'catalogos' => [
                'obras' => fn () => Obra::query()
                    ->orderBy('nombre')
                    ->get(['id', 'codigo', 'nombre', 'distrito', 'estado', 'avance_fisico_pct'])
                    ->map(fn (Obra $obra) => [
                        'id' => $obra->id,
                        'codigo' => $obra->codigo,
                        'nombre' => $obra->nombre,
                        'distrito' => $obra->distrito,
                        'estado' => $obra->estado,
                        'avance_fisico_pct' => $obra->avance_fisico_pct,
                    ])
                    ->values(),
                'almacenes' => fn () => Almacen::query()
                    ->orderBy('nombre')
                    ->get(['id', 'codigo', 'nombre', 'obra_id'])
                    ->map(fn (Almacen $almacen) => [
                        'id' => $almacen->id,
                        'codigo' => $almacen->codigo,
                        'nombre' => $almacen->nombre,
                        'obra_id' => $almacen->obra_id,
                    ])
                    ->values(),
                'materiales' => fn () => Material::query()
                    ->with('unidad:id,codigo,nombre')
                    ->orderBy('nombre')
                    ->get(['id', 'codigo', 'nombre', 'unidad_id'])
                    ->map(fn (Material $material) => [
                        'id' => $material->id,
                        'codigo' => $material->codigo,
                        'nombre' => $material->nombre,
                        'unidad' => $material->unidad ? [
                            'id' => $material->unidad->id,
                            'codigo' => $material->unidad->codigo,
                            'nombre' => $material->unidad->nombre,
                        ] : null,
                    ])
                    ->values(),
            ],
        ];
    }

    /**
     * Build the shared notification feed payload.
     *
     * @return array{items: list<array<string, mixed>>, sin_leer: int}
     */
    private function notificacionesPayload(Request $request): array
    {
        $usuario = $request->user();

        if (! $usuario instanceof Usuario) {
            return ['items' => [], 'sin_leer' => 0];
        }

        return NotificacionesFeed::paraUsuario($usuario);
    }

    /**
     * Build the shared authenticated user payload.
     *
     * @return array<string, mixed>|null
     */
    private function usuarioPayload(Request $request): ?array
    {
        $usuario = $request->user();

        if (! $usuario instanceof Usuario) {
            return null;
        }

        $usuario->loadMissing(['roles.permisos', 'obras', 'almacenes']);

        return [
            'id' => $usuario->id,
            'name' => $usuario->name,
            'email' => $usuario->email,
            'dni' => $usuario->dni,
            'roles' => $usuario->roles
                ->map(fn ($rol) => ['codigo' => $rol->codigo, 'nombre' => $rol->nombre])
                ->values(),
            'permisos' => $usuario->roles
                ->flatMap(fn ($rol) => $rol->permisos)
                ->pluck('codigo')
                ->unique()
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
