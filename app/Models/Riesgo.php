<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Riesgo extends Model
{
    use HasFactory;

    protected $table = 'riesgos';

    protected $fillable = [
        'obra_id',
        'descripcion',
        'categoria',
        'probabilidad',
        'impacto',
        'severidad',
        'respuesta',
        'responsable_id',
        'estado',
        'origen',
    ];

    protected $casts = [
        'probabilidad' => 'integer',
        'impacto' => 'integer',
        'severidad' => 'integer',
    ];

    public function obra(): BelongsTo
    {
        return $this->belongsTo(Obra::class, 'obra_id');
    }

    public function responsable(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'responsable_id');
    }
}
