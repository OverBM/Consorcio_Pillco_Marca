<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class IndicadorAmbiental extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'indicadores_ambientales';

    protected $fillable = [
        'codigo',
        'nombre',
        'unidad',
        'limite_maximo',
    ];

    protected $casts = [
        'limite_maximo' => 'decimal:3',
    ];
}
