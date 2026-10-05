<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Incidente extends Model
{
    use HasFactory;

    protected $table = 'incidentes';

    protected $fillable = [
        'codigo',
        'obra_id',
        'trabajador_id',
        'reportado_por',
        'tipo',
        'gravedad',
        'ocurrido_en',
        'descripcion',
        'requiere_traslado',
        'estado',
        'causas',
        'reporte_tecnico_id',
        'validado_por',
        'remitido_en',
    ];

    protected $casts = [
        'ocurrido_en' => 'datetime',
        'remitido_en' => 'datetime',
        'requiere_traslado' => 'boolean',
    ];

    public function obra(): BelongsTo
    {
        return $this->belongsTo(Obra::class, 'obra_id');
    }

    public function trabajador(): BelongsTo
    {
        return $this->belongsTo(Trabajador::class, 'trabajador_id');
    }

    public function reportador(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'reportado_por');
    }
}
