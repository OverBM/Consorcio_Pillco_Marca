<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Partida extends Model
{
    use HasFactory;

    protected $table = 'partidas';

    protected $fillable = [
        'obra_id',
        'frente_id',
        'codigo',
        'descripcion',
        'unidad',
        'metrado',
        'costo_unitario',
        'avance_pct',
        'fecha_inicio_prevista',
        'fecha_fin_prevista',
    ];

    protected $casts = [
        'metrado' => 'decimal:3',
        'costo_unitario' => 'decimal:4',
        'avance_pct' => 'decimal:2',
        'fecha_inicio_prevista' => 'date',
        'fecha_fin_prevista' => 'date',
    ];

    public function obra(): BelongsTo
    {
        return $this->belongsTo(Obra::class, 'obra_id');
    }
}
