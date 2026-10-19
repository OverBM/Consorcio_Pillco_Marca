<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class OrdenCompra extends Model
{
    use Auditable;
    use HasFactory, SoftDeletes;

    protected $table = 'ordenes_compra';

    protected $fillable = [
        'codigo',
        'requerimiento_id',
        'cotizacion_id',
        'proveedor_id',
        'obra_id',
        'almacen_destino_id',
        'urgente',
        'estado',
        'total',
        'emitida_por',
        'fecha_entrega_prometida',
    ];

    protected $casts = [
        'urgente' => 'boolean',
        'total' => 'decimal:2',
        'fecha_entrega_prometida' => 'date',
    ];

    public function obra(): BelongsTo
    {
        return $this->belongsTo(Obra::class, 'obra_id');
    }

    public function almacenDestino(): BelongsTo
    {
        return $this->belongsTo(Almacen::class, 'almacen_destino_id');
    }

    public function emitente(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'emitida_por');
    }

    public function proveedor(): BelongsTo
    {
        return $this->belongsTo(Proveedor::class, 'proveedor_id');
    }

    public function recepciones(): HasMany
    {
        return $this->hasMany(Recepcion::class, 'orden_compra_id');
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(OrdenCompraDetalle::class, 'orden_compra_id');
    }
}
