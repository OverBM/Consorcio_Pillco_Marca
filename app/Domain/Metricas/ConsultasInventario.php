<?php

namespace App\Domain\Metricas;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Consultas base compartidas por los indicadores de inventario.
 *
 * Mantiene una única definición de los joins y filtros de contexto para que
 * el panel general y el módulo de reportes no dupliquen lógica.
 */
final class ConsultasInventario
{
    public static function stockQuery(?int $almacenId, ?int $obraId, ?int $categoriaId = null): Builder
    {
        return DB::table('stock_almacen as s')
            ->join('materiales as m', 'm.id', '=', 's.material_id')
            ->join('almacenes as a', 'a.id', '=', 's.almacen_id')
            ->leftJoin('categorias_material as c', 'c.id', '=', 'm.categoria_id')
            ->when($almacenId !== null, fn ($q) => $q->where('s.almacen_id', $almacenId))
            ->when($almacenId === null && $obraId !== null, fn ($q) => $q->where('a.obra_id', $obraId))
            ->when($categoriaId !== null, fn ($q) => $q->where('m.categoria_id', $categoriaId));
    }

    public static function kardexQuery(?int $almacenId, ?int $obraId, ?int $categoriaId = null): Builder
    {
        return DB::table('kardex as k')
            ->join('materiales as m', 'm.id', '=', 'k.material_id')
            ->join('almacenes as a', 'a.id', '=', 'k.almacen_id')
            ->when($almacenId !== null, fn ($q) => $q->where('k.almacen_id', $almacenId))
            ->when($almacenId === null && $obraId !== null, fn ($q) => $q->where('a.obra_id', $obraId))
            ->when($categoriaId !== null, fn ($q) => $q->where('m.categoria_id', $categoriaId));
    }
}
