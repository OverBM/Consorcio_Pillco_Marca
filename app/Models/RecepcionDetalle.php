<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecepcionDetalle extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'recepcion_detalles';

    protected $fillable = [
        'recepcion_id',
        'orden_compra_detalle_id',
        'material_id',
        'lote_id',
        'ubicacion_id',
        'cantidad_ordenada',
        'cantidad_recibida',
        'cumple_especificaciones',
        'detalle_validacion',
        'motivo_rechazo',
    ];

    protected $casts = [
        'cantidad_ordenada' => 'decimal:3',
        'cantidad_recibida' => 'decimal:3',
        'cumple_especificaciones' => 'boolean',
        'detalle_validacion' => 'array',
    ];

    public function recepcion(): BelongsTo
    {
        return $this->belongsTo(Recepcion::class, 'recepcion_id');
    }

    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class, 'material_id');
    }

    public function lote(): BelongsTo
    {
        return $this->belongsTo(Lote::class, 'lote_id');
    }
}
