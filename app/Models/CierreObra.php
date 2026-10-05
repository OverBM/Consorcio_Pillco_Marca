<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CierreObra extends Model
{
    use HasFactory;

    protected $table = 'cierres_obra';

    protected $fillable = [
        'obra_id',
        'fecha_ejecucion_100',
        'informe_final_id',
        'fecha_recepcion_obra',
        'acta_recepcion_id',
        'estado',
        'excedentes_evaluados',
    ];

    protected $casts = [
        'fecha_ejecucion_100' => 'date',
        'fecha_recepcion_obra' => 'date',
        'excedentes_evaluados' => 'boolean',
    ];

    public function obra(): BelongsTo
    {
        return $this->belongsTo(Obra::class, 'obra_id');
    }
}
