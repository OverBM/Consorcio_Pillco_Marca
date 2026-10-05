<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Planilla extends Model
{
    use HasFactory;

    protected $table = 'planillas';

    protected $fillable = [
        'obra_id',
        'periodo',
        'estado',
        'total',
        'procesada_por',
    ];

    protected $casts = [
        'total' => 'decimal:2',
    ];

    public function obra(): BelongsTo
    {
        return $this->belongsTo(Obra::class, 'obra_id');
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(PlanillaDetalle::class, 'planilla_id');
    }
}
