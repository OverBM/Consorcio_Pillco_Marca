<?php

namespace App\Models;

use App\Models\Concerns\BelongsToAlmacenYMaterial;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Residuo extends Model
{
    use BelongsToAlmacenYMaterial;
    use HasFactory;

    protected $table = 'residuos';

    protected $fillable = [
        'obra_id',
        'almacen_id',
        'clase',
        'descripcion',
        'material_id',
        'volumen',
        'unidad',
        'registrado_por',
        'destino',
        'transferencia_id',
        'proveedor_id',
        'eors_id',
        'manifiesto_id',
        'estado',
    ];

    protected $casts = [
        'volumen' => 'decimal:3',
    ];

    public function obra(): BelongsTo
    {
        return $this->belongsTo(Obra::class, 'obra_id');
    }

    public function setEorsIdAttribute(mixed $value): void
    {
        $this->attributes['proveedor_id'] = $value;
    }

    public function getEorsIdAttribute(): ?int
    {
        return isset($this->attributes['proveedor_id']) ? (int) $this->attributes['proveedor_id'] : null;
    }

    public function proveedor(): BelongsTo
    {
        return $this->belongsTo(Proveedor::class, 'proveedor_id');
    }

    public function eors(): BelongsTo
    {
        return $this->belongsTo(Proveedor::class, 'proveedor_id');
    }
}
