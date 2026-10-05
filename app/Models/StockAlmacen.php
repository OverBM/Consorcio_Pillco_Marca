<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockAlmacen extends Model
{
    protected $table = 'stock_almacen';

    protected $fillable = [
        'almacen_id',
        'material_id',
        'ubicacion_id',
        'cantidad',
        'cantidad_reservada',
        'stock_minimo',
        'stock_seguridad',
        'punto_reorden',
        'stock_maximo',
    ];

    protected function casts(): array
    {
        return [
            'cantidad' => 'decimal:3',
            'cantidad_reservada' => 'decimal:3',
            'stock_minimo' => 'decimal:3',
            'stock_seguridad' => 'decimal:3',
            'punto_reorden' => 'decimal:3',
            'stock_maximo' => 'decimal:3',
        ];
    }

    public function almacen(): BelongsTo
    {
        return $this->belongsTo(Almacen::class, 'almacen_id');
    }

    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class, 'material_id');
    }

    public function getCantidadDisponibleAttribute(): float
    {
        return (float) ($this->cantidad - $this->cantidad_reservada);
    }
}
