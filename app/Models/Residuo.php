<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Residuo extends Model
{
    use HasFactory;

    protected $table = 'residuos';

    protected $fillable = [
        'obra_id',
        'almacen_id',
        'clase',
        'descripcion',
        'material_id',
        'volumen',
        'unidad',
        'registrado_por',
        'destino',
        'transferencia_id',
        'eors_id',
        'manifiesto_id',
        'estado',
    ];

    protected $casts = [
        'volumen' => 'decimal:3',
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

    public function eors(): BelongsTo
    {
        return $this->belongsTo(EmpresaEors::class, 'eors_id');
    }
}
