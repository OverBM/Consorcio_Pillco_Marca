<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Material extends Model
{
    use Auditable;
    use SoftDeletes;

    protected $table = 'materiales';

    protected $fillable = [
        'codigo',
        'nombre',
        'categoria_id',
        'unidad_id',
        'criticidad',
        'es_epp',
        'requiere_serie',
        'requiere_lote',
        'costo_referencial',
        'especificaciones',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'es_epp' => 'boolean',
            'requiere_serie' => 'boolean',
            'requiere_lote' => 'boolean',
            'activo' => 'boolean',
            'costo_referencial' => 'decimal:4',
            'especificaciones' => 'array',
        ];
    }

    public function categoria(): BelongsTo
    {
        return $this->belongsTo(CategoriaMaterial::class, 'categoria_id');
    }

    public function unidad(): BelongsTo
    {
        return $this->belongsTo(UnidadMedida::class, 'unidad_id');
    }

    public function unidadMedida(): BelongsTo
    {
        return $this->belongsTo(UnidadMedida::class, 'unidad_id');
    }

    public function stock(): HasMany
    {
        return $this->hasMany(StockAlmacen::class, 'material_id');
    }

    public function kardex(): HasMany
    {
        return $this->hasMany(Kardex::class, 'material_id');
    }
}
