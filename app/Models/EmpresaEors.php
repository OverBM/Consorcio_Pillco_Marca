<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmpresaEors extends Model
{
    use HasFactory;

    protected $table = 'empresas_eors';

    protected $fillable = [
        'ruc',
        'razon_social',
        'autorizacion',
        'vigente_hasta',
    ];

    protected $casts = [
        'vigente_hasta' => 'date',
    ];
}
