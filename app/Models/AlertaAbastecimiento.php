<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AlertaAbastecimiento extends Model
{
    protected $table = 'alertas_abastecimiento';

    protected $fillable = [
        'almacen_id',
        'material_id',
        'tipo',
        'severidad',
        'fecha_estimada',
        'cantidad_sugerida',
        'detalle',
        'clave_idempotente',
        'estado',
        'reconocida_por',
        'reconocida_en',
    ];

    protected function casts(): array
    {
        return [
            'fecha_estimada' => 'date',
            'cantidad_sugerida' => 'decimal:3',
            'reconocida_en' => 'datetime',
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

    public function reconocidaPor(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'reconocida_por');
    }
}
