<?php

namespace App\Http\Controllers\Web\Concerns;

use App\Models\Almacen;
use App\Models\Obra;
use Illuminate\Database\Eloquent\Builder;

/**
 * Aplica el contexto operativo activo (obra/almacén) guardado en sesión
 * a las consultas de los controladores de vista.
 */
trait FiltraContextoOperativo
{
    protected function obraActivaId(): ?int
    {
        $id = session('obra_activa_id');

        return $id !== null ? (int) $id : null;
    }

    protected function almacenActivoId(): ?int
    {
        $id = session('almacen_activo_id');

        return $id !== null ? (int) $id : null;
    }

    /**
     * Filtra una consulta que dispone tanto de `obra_id` como de `almacen_id`.
     * El almacén activo manda; si no, se aplica la obra activa.
     *
     * @param  Builder<*>  $query
     * @return Builder<*>
     */
    protected function filtrarContexto(Builder $query, string $obraColumn = 'obra_id', string $almacenColumn = 'almacen_id'): Builder
    {
        $almacenId = $this->almacenActivoId();

        if ($almacenId !== null) {
            return $query->where($almacenColumn, $almacenId);
        }

        $obraId = $this->obraActivaId();

        if ($obraId !== null) {
            return $query->where($obraColumn, $obraId);
        }

        return $query;
    }

    /**
     * Filtra una consulta que solo dispone de `almacen_id`. Si la obra está
     * activa (sin almacén), se acota por los almacenes de esa obra.
     *
     * @param  Builder<*>  $query
     * @return Builder<*>
     */
    protected function filtrarContextoAlmacen(Builder $query, string $almacenColumn = 'almacen_id', string $almacenRelation = 'almacen'): Builder
    {
        $almacenId = $this->almacenActivoId();

        if ($almacenId !== null) {
            return $query->where($almacenColumn, $almacenId);
        }

        $obraId = $this->obraActivaId();

        if ($obraId !== null) {
            return $query->whereHas($almacenRelation, fn (Builder $q) => $q->where('obra_id', $obraId));
        }

        return $query;
    }

    /**
     * Filtra una consulta cuyos datos de contexto viven en un modelo
     * relacionado (p. ej. una cotización respecto a su requerimiento).
     *
     * @param  Builder<*>  $query
     * @return Builder<*>
     */
    protected function filtrarContextoVinculado(Builder $query, string $relation, string $obraColumn = 'obra_id', string $almacenColumn = 'almacen_id'): Builder
    {
        $almacenId = $this->almacenActivoId();

        if ($almacenId !== null) {
            return $query->whereHas($relation, fn (Builder $q) => $q->where($almacenColumn, $almacenId));
        }

        $obraId = $this->obraActivaId();

        if ($obraId !== null) {
            return $query->whereHas($relation, fn (Builder $q) => $q->where($obraColumn, $obraId));
        }

        return $query;
    }

    /**
     * Aplica el contexto a la lista de obras (para el catálogo del panel).
     *
     * @param  Builder<Almacen>|Builder<Obra>  $query
     * @return Builder<*>
     */
    protected function filtrarContextoObras(Builder $query): Builder
    {
        $obraId = $this->obraActivaId();

        if ($obraId !== null) {
            return $query->whereKey($obraId);
        }

        $almacenId = $this->almacenActivoId();

        if ($almacenId !== null) {
            $obraDelAlmacen = Almacen::query()->whereKey($almacenId)->value('obra_id');

            if ($obraDelAlmacen !== null) {
                return $query->whereKey($obraDelAlmacen);
            }
        }

        return $query;
    }

    /**
     * Aplica el contexto a la lista de almacenes.
     *
     * @param  Builder<Almacen>  $query
     * @return Builder<Almacen>
     */
    protected function filtrarContextoAlmacenes(Builder $query): Builder
    {
        $almacenId = $this->almacenActivoId();

        if ($almacenId !== null) {
            return $query->whereKey($almacenId);
        }

        $obraId = $this->obraActivaId();

        if ($obraId !== null) {
            return $query->where('obra_id', $obraId);
        }

        return $query;
    }
}
