<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DespachoPosicion extends Model
{
    protected $table = 'despacho_posiciones';

    protected $fillable = [
        'despacho_id',
        'latitud',
        'longitud',
        'precision_m',
        'velocidad_kmh',
        'rumbo',
        'origen',
        'uuid',
        'capturada_en',
        'recibida_en',
    ];

    protected function casts(): array
    {
        return [
            'latitud' => 'decimal:7',
            'longitud' => 'decimal:7',
            'precision_m' => 'decimal:2',
            'velocidad_kmh' => 'decimal:2',
            'rumbo' => 'decimal:2',
            'capturada_en' => 'datetime',
            'recibida_en' => 'datetime',
        ];
    }

    public function despacho(): BelongsTo
    {
        return $this->belongsTo(Despacho::class, 'despacho_id');
    }
}
