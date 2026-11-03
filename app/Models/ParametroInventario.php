<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ParametroInventario extends Model
{
    protected $table = 'parametros_inventario';

    protected $fillable = [
        'almacen_id',
        'material_id',
        'eoq',
        'stock_seguridad',
        'punto_reorden',
        'costo_total_relevante',
        'demanda_media_diaria',
        'demanda_anual',
        'lead_time_dias',
        'nivel_servicio',
        'clase_abc',
        'clase_xyz',
        'clase_combinada',
        'coeficiente_variacion',
        'estado',
        'modelo_version',
        'origen',
        'vigente',
        'payload',
        'calculado_en',
    ];

    protected function casts(): array
    {
        return [
            'eoq' => 'decimal:3',
            'stock_seguridad' => 'decimal:3',
            'punto_reorden' => 'decimal:3',
            'costo_total_relevante' => 'decimal:3',
            'demanda_media_diaria' => 'decimal:4',
            'demanda_anual' => 'decimal:4',
            'lead_time_dias' => 'decimal:2',
            'nivel_servicio' => 'decimal:4',
            'coeficiente_variacion' => 'decimal:6',
            'vigente' => 'boolean',
            'payload' => 'array',
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
