<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RuteoConsumo extends Model
{
    protected $table = 'ruteo_consumos';

    protected $fillable = [
        'fecha',
        'driver',
        'llamadas',
        'exitos',
        'fallos',
        'geocodificaciones',
    ];

    protected function casts(): array
    {
        return [
            'fecha' => 'date',
        ];
    }
}
