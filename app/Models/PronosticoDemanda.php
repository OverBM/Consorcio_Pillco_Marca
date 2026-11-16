<?php

namespace App\Models;

use App\Models\Concerns\BelongsToAlmacenYMaterial;
use Illuminate\Database\Eloquent\Model;

class PronosticoDemanda extends Model
{
    use BelongsToAlmacenYMaterial;

    protected $table = 'pronosticos_demanda';

    protected $fillable = [
        'almacen_id',
        'material_id',
        'fecha',
        'cantidad',
        'limite_inferior',
        'limite_superior',
        'mape',
        'rmse',
        'metodo_usado',
        'baja_confianza',
        'modelo_version',
        'calculado_en',
    ];

    protected function casts(): array
    {
        return [
            'fecha' => 'date',
            'cantidad' => 'decimal:3',
            'limite_inferior' => 'decimal:3',
            'limite_superior' => 'decimal:3',
            'mape' => 'decimal:3',
            'rmse' => 'decimal:4',
            'baja_confianza' => 'boolean',
            'calculado_en' => 'datetime',
        ];
    }
}
