<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Adelanto extends Model
{
    use HasFactory;

    protected $table = 'adelantos';

    protected $fillable = [
        'obra_id',
        'tipo',
        'monto',
        'estado',
        'banco_fideicomitente',
        'solicitado_por',
        'registrado_por_financiera',
        'garantia_fiel_cumplimiento',
    ];

    protected $casts = [
        'monto' => 'decimal:2',
        'garantia_fiel_cumplimiento' => 'boolean',
    ];

    public function obra(): BelongsTo
    {
        return $this->belongsTo(Obra::class, 'obra_id');
    }

    public function solicitante(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'solicitado_por');
    }

    public function eventos(): HasMany
    {
        return $this->hasMany(AdelantoEvento::class, 'adelanto_id');
    }
}
