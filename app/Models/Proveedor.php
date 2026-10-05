<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Proveedor extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'proveedores';

    protected $fillable = [
        'ruc',
        'razon_social',
        'contacto',
        'telefono',
        'email',
        'direccion',
        'calificacion',
        'activo',
    ];

    protected $casts = [
        'calificacion' => 'decimal:2',
        'activo' => 'boolean',
    ];

    public function ordenesCompra(): HasMany
    {
        return $this->hasMany(OrdenCompra::class, 'proveedor_id');
    }
}
