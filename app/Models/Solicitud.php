<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Solicitud extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'solicitudes';

    protected $fillable = [
        'codigo',
        'tipo',
        'obra_id',
        'almacen_id',
        'solicitante_id',
        'partida_id',
        'frente_id',
        'observacion_tecnica_id',
        'prioridad',
        'urgente',
        'justificacion',
        'fecha_requerida',
        'estado',
        'atendida_en',
        'aprobado_por',
        'aprobado_en',
        'motivo_rechazo',
        'ubicacion_solicitud',
    ];

    protected $casts = [
        'urgente' => 'boolean',
        'fecha_requerida' => 'date',
        'atendida_en' => 'datetime',
        'aprobado_en' => 'datetime',
    ];

    public function scopeCompra($query)
    {
        return $query->where('tipo', 'compra');
    }

    public function scopeAlmacen($query)
    {
        return $query->where('tipo', 'almacen');
    }

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

    public function aprobador(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'aprobado_por');
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(SolicitudDetalle::class, 'solicitud_id');
    }

    public function cotizaciones(): HasMany
    {
        return $this->hasMany(Cotizacion::class, 'solicitud_id');
    }
}
