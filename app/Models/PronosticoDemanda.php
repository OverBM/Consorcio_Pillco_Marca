<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PronosticoDemanda extends Model
{
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

    public function almacen(): BelongsTo
    {
        return $this->belongsTo(Almacen::class, 'almacen_id');
    }

    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class, 'material_id');
    }
}
