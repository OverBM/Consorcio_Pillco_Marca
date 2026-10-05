<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Hito extends Model
{
    use HasFactory;

    protected $table = 'hitos';

    protected $fillable = [
        'obra_id',
        'nombre',
        'fecha_planificada',
        'fecha_real',
        'estado',
    ];

    protected $casts = [
        'fecha_planificada' => 'date',
        'fecha_real' => 'date',
    ];

    public function obra(): BelongsTo
    {
        return $this->belongsTo(Obra::class, 'obra_id');
    }
}
