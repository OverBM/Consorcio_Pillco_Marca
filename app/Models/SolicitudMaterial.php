<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class SolicitudMaterial extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'solicitudes';

    protected $fillable = [
        'codigo',
        'tipo',
        'obra_id',
        'almacen_id',
        'solicitante_id',
        'frente_id',
        'partida_id',
        'observacion_tecnica_id',
        'prioridad',
        'urgente',
        'estado',
        'justificacion',
        'fecha_requerida',
        'atendida_en',
        'aprobado_por',
        'aprobado_en',
        'motivo_rechazo',
        'ubicacion_solicitud',
    ];

    protected $casts = [
        'urgente' => 'boolean',
        'atendida_en' => 'datetime',
        'aprobado_en' => 'datetime',
        'fecha_requerida' => 'date',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope('almacen', function (Builder $query): void {
            $query->where($query->getModel()->getTable().'.tipo', 'almacen');
        });

        static::creating(function (self $solicitud): void {
            $solicitud->attributes['tipo'] = 'almacen';
        });
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

    public function detalles(): HasMany
    {
        return $this->hasMany(SolicitudMaterialDetalle::class, 'solicitud_id');
    }
}
