<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Requerimiento extends Model
{
    use Auditable;
    use HasFactory, SoftDeletes;

    protected $table = 'requerimientos';

    protected $fillable = [
        'codigo',
        'obra_id',
        'almacen_id',
        'partida_id',
        'observacion_tecnica_id',
        'solicitante_id',
        'prioridad',
        'estado',
        'justificacion',
        'fecha_requerida',
        'aprobado_por',
        'aprobado_en',
        'motivo_rechazo',
    ];

    protected $casts = [
        'fecha_requerida' => 'date',
        'aprobado_en' => 'datetime',
    ];

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
        return $this->hasMany(RequerimientoDetalle::class, 'requerimiento_id');
    }

    public function cotizaciones(): HasMany
    {
        return $this->hasMany(Cotizacion::class, 'requerimiento_id');
    }
}
