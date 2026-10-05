<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Transferencia extends Model
{
    use HasFactory;

    protected $table = 'transferencias';

    protected $fillable = [
        'codigo',
        'almacen_origen_id',
        'almacen_destino_id',
        'solicitud_id',
        'excedente_id',
        'motivo',
        'estado',
        'generada_automaticamente',
        'distancia_m',
        'eta_min',
        'puntaje',
        'creada_por',
        'aprobada_por',
        'aprobada_en',
    ];

    protected $casts = [
        'generada_automaticamente' => 'boolean',
        'distancia_m' => 'decimal:1',
        'eta_min' => 'decimal:1',
        'puntaje' => 'decimal:4',
        'aprobada_en' => 'datetime',
    ];

    public function almacenOrigen(): BelongsTo
    {
        return $this->belongsTo(Almacen::class, 'almacen_origen_id');
    }

    public function almacenDestino(): BelongsTo
    {
        return $this->belongsTo(Almacen::class, 'almacen_destino_id');
    }

    public function solicitud(): BelongsTo
    {
        return $this->belongsTo(SolicitudMaterial::class, 'solicitud_id');
    }

    public function excedente(): BelongsTo
    {
        return $this->belongsTo(ExcedenteDetectado::class, 'excedente_id');
    }

    public function creador(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'creada_por');
    }

    public function aprobador(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'aprobada_por');
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(TransferenciaDetalle::class, 'transferencia_id');
    }

    public function despacho(): HasOne
    {
        return $this->hasOne(Despacho::class, 'transferencia_id');
    }

    public function confirmacionRecepcion(): HasOne
    {
        return $this->hasOne(ConfirmacionRecepcionDestino::class, 'transferencia_id');
    }
}
