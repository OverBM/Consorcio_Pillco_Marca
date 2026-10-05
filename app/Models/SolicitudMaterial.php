<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SolicitudMaterial extends Model
{
    use HasFactory;

    protected $table = 'solicitudes_material';

    protected $fillable = [
        'codigo',
        'obra_id',
        'almacen_id',
        'solicitante_id',
        'frente_id',
        'partida_id',
        'urgente',
        'estado',
        'atendida_en',
        'ubicacion_solicitud',
    ];

    protected $casts = [
        'urgente' => 'boolean',
        'atendida_en' => 'datetime',
    ];

    public function obra(): BelongsTo
    {
        return $this->belongsTo(Obra::class, 'obra_id');
    }

    public function almacen(): BelongsTo
    {
        return $this->belongsTo(Almacen::class, 'almacen_id');
    }

    public function solicitante(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'solicitante_id');
    }

    public function partida(): BelongsTo
    {
        return $this->belongsTo(Partida::class, 'partida_id');
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(SolicitudMaterialDetalle::class, 'solicitud_id');
    }
}
