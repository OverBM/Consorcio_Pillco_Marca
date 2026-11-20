<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Alerta extends Model
{
    use HasFactory;

    protected $table = 'alertas';

    protected $fillable = [
        'obra_id',
        'almacen_id',
        'material_id',
        'transferencia_id',
        'tipo',
        'severidad',
        'mensaje',
        'payload',
        'clave_idempotente',
        'referencia_tipo',
        'referencia_id',
        'estado',
        'reconocida_por',
        'reconocida_en',
    ];

    protected $casts = [
        'payload' => 'array',
        'reconocida_en' => 'datetime',
    ];

    public function obra(): BelongsTo
    {
        return $this->belongsTo(Obra::class, 'obra_id');
    }

    public function almacen(): BelongsTo
    {
        return $this->belongsTo(Almacen::class, 'almacen_id');
    }

    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class, 'material_id');
    }

    public function transferencia(): BelongsTo
    {
        return $this->belongsTo(Transferencia::class, 'transferencia_id');
    }

    public function reconocidaPor(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'reconocida_por');
    }

    public function notificaciones(): HasMany
    {
        return $this->hasMany(Notificacion::class, 'alerta_id');
    }
}
