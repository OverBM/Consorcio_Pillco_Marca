<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Comunicacion extends Model
{
    use HasFactory;

    protected $table = 'comunicaciones';

    protected $fillable = [
        'obra_id',
        'interesado_id',
        'tipo',
        'sentido',
        'asunto',
        'fecha',
        'estado',
        'documento_id',
    ];

    protected $casts = [
        'fecha' => 'date',
    ];

    public function obra(): BelongsTo
    {
        return $this->belongsTo(Obra::class, 'obra_id');
    }

    public function interesado(): BelongsTo
    {
        return $this->belongsTo(Interesado::class, 'interesado_id');
    }
}
