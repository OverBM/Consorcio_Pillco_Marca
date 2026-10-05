<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RequerimientoDetalle extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'requerimiento_detalles';

    protected $fillable = [
        'requerimiento_id',
        'material_id',
        'cantidad',
        'cantidad_atendida',
    ];

    protected $casts = [
        'cantidad' => 'decimal:3',
        'cantidad_atendida' => 'decimal:3',
    ];

    public function requerimiento(): BelongsTo
    {
        return $this->belongsTo(Requerimiento::class, 'requerimiento_id');
    }

    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class, 'material_id');
    }
}
