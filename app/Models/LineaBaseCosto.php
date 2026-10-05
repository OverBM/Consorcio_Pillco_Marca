<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LineaBaseCosto extends Model
{
    use HasFactory;

    protected $table = 'lineas_base_costo';

    protected $fillable = [
        'obra_id',
        'version',
        'bac',
        'vigente',
        'aprobada_por',
    ];

    protected $casts = [
        'bac' => 'decimal:2',
        'vigente' => 'boolean',
    ];

    public function obra(): BelongsTo
    {
        return $this->belongsTo(Obra::class, 'obra_id');
    }

    public function aprobador(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'aprobada_por');
    }
}
