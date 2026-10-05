<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EppSolicitud extends Model
{
    use HasFactory;

    protected $table = 'epp_solicitudes';

    protected $fillable = [
        'trabajador_id',
        'almacen_id',
        'material_id',
        'cantidad',
        'autorizada_por',
        'estado',
        'requerimiento_id',
    ];

    protected $casts = [
        'cantidad' => 'decimal:2',
    ];

    public function trabajador(): BelongsTo
    {
        return $this->belongsTo(Trabajador::class, 'trabajador_id');
    }

    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class, 'material_id');
    }

    public function almacen(): BelongsTo
    {
        return $this->belongsTo(Almacen::class, 'almacen_id');
    }
}
