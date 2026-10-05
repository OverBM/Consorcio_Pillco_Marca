<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeccionAprendida extends Model
{
    use HasFactory;

    protected $table = 'lecciones_aprendidas';

    protected $fillable = [
        'obra_id',
        'area_conocimiento',
        'descripcion',
        'recomendacion',
        'registrada_por',
    ];

    public function obra(): BelongsTo
    {
        return $this->belongsTo(Obra::class, 'obra_id');
    }

    public function registrador(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'registrada_por');
    }
}
