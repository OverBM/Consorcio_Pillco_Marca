<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class MaterialProveedor extends Model
{
    use Auditable;
    use SoftDeletes;

    protected $table = 'material_proveedor';

    protected $fillable = [
        'material_id',
        'proveedor_id',
        'lead_time_dias',
        'costo_pedido',
        'precio_unitario',
        'es_principal',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'lead_time_dias' => 'decimal:2',
            'costo_pedido' => 'decimal:4',
            'precio_unitario' => 'decimal:4',
            'es_principal' => 'boolean',
            'activo' => 'boolean',
        ];
    }

    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class, 'material_id');
    }

    public function proveedor(): BelongsTo
    {
        return $this->belongsTo(Proveedor::class, 'proveedor_id');
    }
}
