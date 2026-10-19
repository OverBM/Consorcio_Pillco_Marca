<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Support\NotificadorOperativo;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockAlmacen extends Model
{
    use Auditable;

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

    protected static function booted(): void
    {
        static::updated(function (StockAlmacen $stock): void {
            if (! $stock->wasChanged('cantidad')) {
                return;
            }

            $anterior = (float) $stock->getOriginal('cantidad');
            $actual = (float) $stock->cantidad;

            if ($actual >= $anterior) {
                return;
            }

            $disponible = $actual - (float) $stock->cantidad_reservada;

            if ($disponible > (float) $stock->stock_minimo) {
                return;
            }

            $material = $stock->material;
            $almacen = $stock->almacen;

            NotificadorOperativo::aRoles(
                ['almacenero_obra', 'jefe_logistica_compras'],
                'stock_critico',
                'Stock crítico: '.($material?->nombre ?? 'Material'),
                'Quedan '.number_format($disponible, 3).' unidades en '.(($almacen?->nombre) ?? 'el almacén').' (mínimo '.number_format((float) $stock->stock_minimo, 3).').',
                'material',
                $stock->material_id,
            );
        });
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
