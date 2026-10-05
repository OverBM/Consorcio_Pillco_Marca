<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Marcacion extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'marcaciones';

    protected $fillable = [
        'trabajador_id',
        'obra_id',
        'tipo',
        'marcado_en',
        'distancia_a_obra_m',
        'dentro_geocerca',
        'ubicacion',
        'created_at',
    ];

    protected $casts = [
        'marcado_en' => 'datetime',
        'created_at' => 'datetime',
        'distancia_a_obra_m' => 'decimal:1',
        'dentro_geocerca' => 'boolean',
    ];

    public function trabajador(): BelongsTo
    {
        return $this->belongsTo(Trabajador::class, 'trabajador_id');
    }

    public function obra(): BelongsTo
    {
        return $this->belongsTo(Obra::class, 'obra_id');
    }
}
