<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SolicitudCambio extends Model
{
    use HasFactory;

    protected $table = 'solicitudes_cambio';

    protected $fillable = [
        'obra_id',
        'tipo',
        'descripcion',
        'impacto_plazo_dias',
        'impacto_costo',
        'estado',
        'solicitada_por',
        'decidida_por',
        'decidida_en',
    ];

    protected $casts = [
        'impacto_plazo_dias' => 'integer',
        'impacto_costo' => 'decimal:2',
        'decidida_en' => 'datetime',
    ];

    public function obra(): BelongsTo
    {
        return $this->belongsTo(Obra::class, 'obra_id');
    }

    public function solicitante(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'solicitada_por');
    }

    public function decisor(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'decidida_por');
    }
}
