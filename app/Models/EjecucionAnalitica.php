<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EjecucionAnalitica extends Model
{
    protected $table = 'ejecuciones_analitica';

    protected $fillable = [
        'origen',
        'estado',
        'inicio',
        'fin',
        'duracion_ms',
        'series',
        'calculadas',
        'alertas',
        'errores',
        'mensaje',
    ];

    protected function casts(): array
    {
        return [
            'inicio' => 'datetime',
            'fin' => 'datetime',
        ];
    }
}
