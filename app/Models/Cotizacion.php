<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cotizacion extends Model
{
    use HasFactory;

    protected $table = 'cotizaciones';

    protected $fillable = [
        'requerimiento_id',
        'proveedor_id',
        'total',
        'plazo_entrega_dias',
        'condiciones',
        'estado',
        'motivo_seleccion',
    ];

    protected $casts = [
        'total' => 'decimal:2',
        'plazo_entrega_dias' => 'integer',
    ];

    public function requerimiento(): BelongsTo
    {
        return $this->belongsTo(Requerimiento::class, 'requerimiento_id');
    }

    public function proveedor(): BelongsTo
    {
        return $this->belongsTo(Proveedor::class, 'proveedor_id');
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(CotizacionDetalle::class, 'cotizacion_id');
    }
}
