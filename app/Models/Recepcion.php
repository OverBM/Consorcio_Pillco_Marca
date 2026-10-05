<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Recepcion extends Model
{
    use HasFactory;

    protected $table = 'recepciones';

    protected $fillable = [
        'codigo',
        'almacen_id',
        'orden_compra_id',
        'almacenero_id',
        'guia_remision',
        'estado',
        'recibida_en',
        'firma_ruta',
        'foto_ruta',
        'observaciones',
        'ubicacion_recepcion',
    ];

    protected $casts = [
        'recibida_en' => 'datetime',
    ];

    public function almacen(): BelongsTo
    {
        return $this->belongsTo(Almacen::class, 'almacen_id');
    }

    public function ordenCompra(): BelongsTo
    {
        return $this->belongsTo(OrdenCompra::class, 'orden_compra_id');
    }

    public function almacenero(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'almacenero_id');
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(RecepcionDetalle::class, 'recepcion_id');
    }
}
