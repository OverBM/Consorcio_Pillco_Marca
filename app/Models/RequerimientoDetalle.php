<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RequerimientoDetalle extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'solicitud_detalles';

    protected $fillable = [
        'solicitud_id',
        'requerimiento_id',
        'material_id',
        'cantidad',
        'cantidad_atendida',
    ];

    protected $casts = [
        'cantidad' => 'decimal:3',
        'cantidad_atendida' => 'decimal:3',
    ];

    public function setRequerimientoIdAttribute(?int $value): void
    {
        $this->attributes['solicitud_id'] = $value;
    }

    public function getRequerimientoIdAttribute(): ?int
    {
        return isset($this->attributes['solicitud_id']) ? (int) $this->attributes['solicitud_id'] : null;
    }

    public function requerimiento(): BelongsTo
    {
        return $this->belongsTo(Requerimiento::class, 'solicitud_id');
    }

    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class, 'material_id');
    }
}
