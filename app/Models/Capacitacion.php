<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Capacitacion extends Model
{
    use HasFactory;

    protected $table = 'capacitaciones';

    protected $fillable = [
        'tipo',
        'titulo',
        'obra_id',
        'fecha_programada',
        'instructor',
        'nota_minima',
        'vigencia_meses',
        'programada_por',
        'estado',
    ];

    protected $casts = [
        'fecha_programada' => 'datetime',
        'nota_minima' => 'decimal:1',
        'vigencia_meses' => 'integer',
    ];

    public function obra(): BelongsTo
    {
        return $this->belongsTo(Obra::class, 'obra_id');
    }
}
