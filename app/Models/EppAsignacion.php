<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EppAsignacion extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'epp_asignaciones';

    protected $fillable = [
        'trabajador_id',
        'material_id',
        'almacen_id',
        'numero_serie',
        'entregado_por',
        'entregado_en',
        'estado',
    ];

    protected $casts = [
        'entregado_en' => 'datetime',
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
