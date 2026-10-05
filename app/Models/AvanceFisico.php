<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AvanceFisico extends Model
{
    use HasFactory;

    protected $table = 'avances_fisicos';

    protected $fillable = [
        'obra_id',
        'frente_id',
        'partida_id',
        'periodo',
        'metrado_ejecutado',
        'avance_pct_acumulado',
        'registrado_por',
    ];

    protected $casts = [
        'periodo' => 'date',
        'metrado_ejecutado' => 'decimal:3',
        'avance_pct_acumulado' => 'decimal:2',
    ];

    public function obra(): BelongsTo
    {
        return $this->belongsTo(Obra::class, 'obra_id');
    }

    public function partida(): BelongsTo
    {
        return $this->belongsTo(Partida::class, 'partida_id');
    }

    public function registrador(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'registrado_por');
    }
}
