<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MedicionAmbiental extends Model
{
    use HasFactory;

    protected $table = 'mediciones_ambientales';

    protected $fillable = [
        'obra_id',
        'indicador_id',
        'valor',
        'fuera_de_limite',
        'medida_correctiva',
        'medida_aplicada_por',
        'medido_por',
        'medido_en',
    ];

    protected $casts = [
        'valor' => 'decimal:3',
        'fuera_de_limite' => 'boolean',
        'medido_en' => 'datetime',
    ];

    public function obra(): BelongsTo
    {
        return $this->belongsTo(Obra::class, 'obra_id');
    }

    public function indicador(): BelongsTo
    {
        return $this->belongsTo(IndicadorAmbiental::class, 'indicador_id');
    }
}
