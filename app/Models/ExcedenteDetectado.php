<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExcedenteDetectado extends Model
{
    use HasFactory;

    protected $table = 'excedentes_detectados';

    protected $fillable = [
        'obra_origen_id',
        'almacen_id',
        'material_id',
        'cantidad',
        'origen',
        'estado',
        'detectado_en',
    ];

    protected $casts = [
        'cantidad' => 'decimal:3',
        'detectado_en' => 'datetime',
    ];

    public function obra(): BelongsTo
    {
        return $this->belongsTo(Obra::class, 'obra_origen_id');
    }

    public function almacen(): BelongsTo
    {
        return $this->belongsTo(Almacen::class, 'almacen_id');
    }

    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class, 'material_id');
    }
}
