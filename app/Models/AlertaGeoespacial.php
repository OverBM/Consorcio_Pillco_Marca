<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AlertaGeoespacial extends Model
{
    protected $table = 'alertas_geoespaciales';

    protected $fillable = [
        'despacho_id',
        'tipo',
        'severidad',
        'distancia_m',
        'tiempo_min',
        'detalle',
        'clave_idempotente',
        'estado',
        'reconocida_por',
        'reconocida_en',
    ];

    protected function casts(): array
    {
        return [
            'distancia_m' => 'decimal:1',
            'tiempo_min' => 'decimal:1',
            'reconocida_en' => 'datetime',
        ];
    }

    public function despacho(): BelongsTo
    {
        return $this->belongsTo(Despacho::class, 'despacho_id');
    }
}
