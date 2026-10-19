<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AlertaLeida extends Model
{
    protected $table = 'alerta_leida';

    public $timestamps = false;

    protected $fillable = [
        'alerta_id',
        'usuario_id',
        'leida_en',
    ];

    protected function casts(): array
    {
        return [
            'leida_en' => 'datetime',
        ];
    }
}
