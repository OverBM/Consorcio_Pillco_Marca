<?php

namespace App\Models\Concerns;

use App\Models\Almacen;
use App\Models\Material;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Relaciones comunes de inventario por almacén y material.
 *
 * Centraliza las claves foráneas estándar (`almacen_id`, `material_id`) para
 * evitar bloques repetidos en los modelos de inventario.
 */
trait BelongsToAlmacenYMaterial
{
    public function almacen(): BelongsTo
    {
        return $this->belongsTo(Almacen::class, 'almacen_id');
    }

    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class, 'material_id');
    }
}
