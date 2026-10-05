<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventarioFisico extends Model
{
    use HasFactory;

    protected $table = 'inventarios_fisicos';

    protected $fillable = [
        'almacen_id',
        'periodo',
        'estado',
        'ciego',
        'tolerancia_pct',
        'programado_por',
        'cerrado_por',
        'cerrado_en',
    ];

    protected $casts = [
        'ciego' => 'boolean',
        'tolerancia_pct' => 'decimal:2',
        'cerrado_en' => 'datetime',
    ];

    public function almacen(): BelongsTo
    {
        return $this->belongsTo(Almacen::class, 'almacen_id');
    }

    public function programador(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'programado_por');
    }

    public function cerrador(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'cerrado_por');
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(InventarioFisicoDetalle::class, 'inventario_id');
    }
}
