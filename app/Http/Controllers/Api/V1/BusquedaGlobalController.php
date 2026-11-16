<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Almacen;
use App\Models\Material;
use App\Models\Obra;
use App\Models\OrdenCompra;
use App\Models\Proveedor;
use App\Models\Usuario;
use App\Support\CatalogoModulos;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Búsqueda global agrupada para el command palette.
 *
 * Devuelve módulos navegables y como máximo cinco registros por grupo.
 * Respeta los permisos del usuario: sin `compras.ver` no se exponen órdenes
 * de compra ni proveedores. La comparación es insensible a mayúsculas y
 * acentos para que "mermas", "Almacen" o "almacén" encuentren el módulo o
 * el registro correcto.
 */
class BusquedaGlobalController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:100'],
        ]);

        $termino = trim($validated['q']);
        $usuario = $request->user();
        $permisos = collect();

        if ($usuario instanceof Usuario) {
            $permisos = DB::table('permisos as p')
                ->join('permiso_rol as pr', 'pr.permiso_id', '=', 'p.id')
                ->join('usuario_rol as ur', 'ur.rol_id', '=', 'pr.rol_id')
                ->where('ur.usuario_id', $usuario->getKey())
                ->pluck('p.codigo');
        }

        $grupos = [];

        $modulos = CatalogoModulos::buscar($termino, $permisos->all());

        if ($modulos !== []) {
            $grupos[] = [
                'tipo' => 'modulos',
                'etiqueta' => 'Módulos',
                'items' => $modulos,
            ];
        }

        $grupos = array_merge($grupos, [
            [
                'tipo' => 'obras',
                'etiqueta' => 'Obras',
                'items' => $this->obras($termino),
            ],
            [
                'tipo' => 'almacenes',
                'etiqueta' => 'Almacenes',
                'items' => $this->almacenes($termino),
            ],
            [
                'tipo' => 'materiales',
                'etiqueta' => 'Materiales',
                'items' => $this->materiales($termino),
            ],
        ]);

        if ($permisos->contains('compras.ver')) {
            $grupos[] = [
                'tipo' => 'ordenes_compra',
                'etiqueta' => 'Órdenes de compra',
                'items' => $this->ordenesCompra($termino),
            ];
            $grupos[] = [
                'tipo' => 'proveedores',
                'etiqueta' => 'Proveedores',
                'items' => $this->proveedores($termino),
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
    private function obras(string $termino): array
    {
        $query = Obra::query();
        $this->filtrar($query, ['nombre', 'codigo', 'distrito'], $termino);

        return $query
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
    private function almacenes(string $termino): array
    {
        $query = Almacen::query();
        $this->filtrar($query, ['nombre', 'codigo'], $termino);

        return $query
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
    private function materiales(string $termino): array
    {
        $query = Material::query();
        $this->filtrar($query, ['nombre', 'codigo'], $termino);

        return $query
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
    private function ordenesCompra(string $termino): array
    {
        $query = OrdenCompra::query();
        $this->filtrar($query, ['codigo', 'estado'], $termino);

        return $query
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
    private function proveedores(string $termino): array
    {
        $query = Proveedor::query();
        $this->filtrar($query, ['razon_social', 'ruc'], $termino);

        return $query
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

    /**
     * Aplica una búsqueda OR sobre varias columnas con normalización de
     * mayúsculas y acentos compatible con PostgreSQL y SQLite.
     *
     * @param  array<int, string>  $columnas
     */
    private function filtrar(Builder $query, array $columnas, string $termino): void
    {
        $normalizado = '%'.mb_strtolower(Str::ascii($termino)).'%';

        $query->where(function (Builder $sub) use ($columnas, $normalizado): void {
            foreach ($columnas as $columna) {
                $sub->orWhereRaw($this->expresionNormalizada($columna).' like ?', [$normalizado]);
            }
        });
    }

    private function expresionNormalizada(string $columna): string
    {
        $driver = DB::connection()->getDriverName();

        return match ($driver) {
            'pgsql' => "translate(lower(coalesce({$columna}, '')), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')",
            'sqlite' => "replace(replace(replace(replace(replace(replace(lower(coalesce({$columna}, '')), 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ó', 'o'), 'ú', 'u'), 'ñ', 'n')",
            default => "lower(coalesce({$columna}, ''))",
        };
    }
}
