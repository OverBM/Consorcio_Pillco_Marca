<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventarioFisicoDetalle extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'inventario_fisico_detalles';

    protected $fillable = [
        'inventario_id',
        'material_id',
        'cantidad_sistema',
        'cantidad_contada',
        'cantidad_reconteo',
        'justificacion',
        'justificacion_revisada_por',
        'ajuste_aprobado',
        'ajuste_aprobado_por',
    ];

    protected $casts = [
        'cantidad_sistema' => 'decimal:3',
        'cantidad_contada' => 'decimal:3',
        'cantidad_reconteo' => 'decimal:3',
        'diferencia' => 'decimal:3',
        'ajuste_aprobado' => 'boolean',
    ];

    public function inventario(): BelongsTo
    {
        return $this->belongsTo(InventarioFisico::class, 'inventario_id');
    }

    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class, 'material_id');
    }
}
