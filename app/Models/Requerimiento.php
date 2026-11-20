<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Requerimiento extends Model
{
    use Auditable;
    use HasFactory, SoftDeletes;

    protected $table = 'solicitudes';

    protected $fillable = [
        'codigo',
        'tipo',
        'obra_id',
        'almacen_id',
        'partida_id',
        'frente_id',
        'observacion_tecnica_id',
        'solicitante_id',
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
        'fecha_requerida' => 'date',
        'atendida_en' => 'datetime',
        'aprobado_en' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope('compra', function (Builder $query): void {
            $query->where($query->getModel()->getTable().'.tipo', 'compra');
        });

        static::creating(function (self $requerimiento): void {
            $requerimiento->attributes['tipo'] = 'compra';
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

    public function partida(): BelongsTo
    {
        return $this->belongsTo(Partida::class, 'partida_id');
    }

    public function solicitar(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'solicitante_id');
    }

    /** @deprecated Use solicitar() */
    public function solicitante(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'solicitante_id');
    }

    public function aprobador(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'aprobado_por');
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(RequerimientoDetalle::class, 'solicitud_id');
    }

    public function cotizaciones(): HasMany
    {
        return $this->hasMany(Cotizacion::class, 'solicitud_id');
    }
}
