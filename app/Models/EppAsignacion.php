<?php

namespace App\Models;

use App\Models\Concerns\BelongsToAlmacenYMaterial;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EppAsignacion extends Model
{
    use BelongsToAlmacenYMaterial;
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
}
