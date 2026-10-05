<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SolicitudMaterialDetalle extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'solicitud_material_detalles';

    protected $fillable = [
        'solicitud_id',
        'material_id',
        'cantidad',
        'cantidad_atendida',
    ];

    protected $casts = [
        'cantidad' => 'decimal:3',
        'cantidad_atendida' => 'decimal:3',
    ];

    public function solicitud(): BelongsTo
    {
        return $this->belongsTo(SolicitudMaterial::class, 'solicitud_id');
    }

    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class, 'material_id');
    }
}
