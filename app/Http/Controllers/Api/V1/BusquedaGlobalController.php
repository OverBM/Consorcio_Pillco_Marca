<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Almacen;
use App\Models\Material;
use App\Models\Obra;
use App\Models\OrdenCompra;
use App\Models\Proveedor;
use App\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Búsqueda global agrupada para el command palette.
 *
 * Devuelve como máximo cinco resultados por grupo y respeta los permisos del
 * usuario: sin `compras.ver` no se exponen órdenes de compra ni proveedores.
 */
class BusquedaGlobalController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:100'],
        ]);

        $termino = trim($validated['q']);
        $like = '%'.str_replace(['%', '_'], ['\%', '\_'], $termino).'%';

        $usuario = $request->user();
        $permisos = collect();

        if ($usuario instanceof Usuario) {
            $permisos = DB::table('permisos as p')
                ->join('permiso_rol as pr', 'pr.permiso_id', '=', 'p.id')
                ->join('usuario_rol as ur', 'ur.rol_id', '=', 'pr.rol_id')
                ->where('ur.usuario_id', $usuario->getKey())
                ->pluck('p.codigo');
        }

        $grupos = [
            [
                'tipo' => 'obras',
                'etiqueta' => 'Obras',
                'items' => $this->obras($like),
            ],
            [
                'tipo' => 'almacenes',
                'etiqueta' => 'Almacenes',
                'items' => $this->almacenes($like),
            ],
            [
                'tipo' => 'materiales',
                'etiqueta' => 'Materiales',
                'items' => $this->materiales($like),
            ],
        ];

        if ($permisos->contains('compras.ver')) {
            $grupos[] = [
                'tipo' => 'ordenes_compra',
                'etiqueta' => 'Órdenes de compra',
                'items' => $this->ordenesCompra($like),
            ];
            $grupos[] = [
                'tipo' => 'proveedores',
                'etiqueta' => 'Proveedores',
                'items' => $this->proveedores($like),
            ];
        }

        return response()->json([
            'termino' => $termino,
            'grupos' => $grupos,
        ]);
    }

    /**
     * @return array<int, array{id: string, titulo: string, subtitulo: string, href: string}>
     */
    private function obras(string $like): array
    {
        return Obra::query()
            ->where(fn ($q) => $q->where('nombre', 'like', $like)->orWhere('codigo', 'like', $like))
            ->orderBy('nombre')
            ->limit(5)
            ->get(['id', 'codigo', 'nombre', 'distrito'])
            ->map(fn (Obra $obra): array => [
                'id' => (string) $obra->id,
                'titulo' => trim(($obra->codigo ?? '').' · '.$obra->nombre, ' ·'),
                'subtitulo' => (string) ($obra->distrito ?? ''),
                'href' => '/programa',
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<int, array{id: string, titulo: string, subtitulo: string, href: string}>
     */
    private function almacenes(string $like): array
    {
        return Almacen::query()
            ->where(fn ($q) => $q->where('nombre', 'like', $like)->orWhere('codigo', 'like', $like))
            ->orderBy('nombre')
            ->limit(5)
            ->get(['id', 'codigo', 'nombre'])
            ->map(fn (Almacen $almacen): array => [
                'id' => (string) $almacen->id,
                'titulo' => trim(($almacen->codigo ?? '').' · '.$almacen->nombre, ' ·'),
                'subtitulo' => 'Almacén',
                'href' => '/stock',
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<int, array{id: string, titulo: string, subtitulo: string, href: string}>
     */
    private function materiales(string $like): array
    {
        return Material::query()
            ->where(fn ($q) => $q->where('nombre', 'like', $like)->orWhere('codigo', 'like', $like))
            ->orderBy('nombre')
            ->limit(5)
            ->get(['id', 'codigo', 'nombre'])
            ->map(fn (Material $material): array => [
                'id' => (string) $material->id,
                'titulo' => trim(($material->codigo ?? '').' · '.$material->nombre, ' ·'),
                'subtitulo' => 'Material',
                'href' => '/stock',
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<int, array{id: string, titulo: string, subtitulo: string, href: string}>
     */
    private function ordenesCompra(string $like): array
    {
        return OrdenCompra::query()
            ->where('codigo', 'like', $like)
            ->orderByDesc('id')
            ->limit(5)
            ->get(['id', 'codigo', 'estado'])
            ->map(fn (OrdenCompra $orden): array => [
                'id' => (string) $orden->id,
                'titulo' => (string) $orden->codigo,
                'subtitulo' => 'OC · '.$orden->estado,
                'href' => '/compras/ordenes-compra',
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<int, array{id: string, titulo: string, subtitulo: string, href: string}>
     */
    private function proveedores(string $like): array
    {
        return Proveedor::query()
            ->where(fn ($q) => $q->where('razon_social', 'like', $like)->orWhere('ruc', 'like', $like))
            ->orderBy('razon_social')
            ->limit(5)
            ->get(['id', 'razon_social', 'ruc'])
            ->map(fn (Proveedor $proveedor): array => [
                'id' => (string) $proveedor->id,
                'titulo' => (string) $proveedor->razon_social,
                'subtitulo' => 'RUC '.$proveedor->ruc,
                'href' => '/compras/proveedores',
            ])
            ->values()
            ->all();
    }
}
