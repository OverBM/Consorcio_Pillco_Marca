<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Kardex extends Model
{
    protected $table = 'kardex';

    public $timestamps = false;

    protected $fillable = [
        'almacen_id',
        'material_id',
        'lote_id',
        'tipo_movimiento',
        'cantidad',
        'saldo_resultante',
        'costo_unitario',
        'documento_tipo',
        'documento_id',
        'usuario_id',
        'observacion',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'cantidad' => 'decimal:3',
            'saldo_resultante' => 'decimal:3',
            'costo_unitario' => 'decimal:4',
            'created_at' => 'datetime',
        ];
    }

    public function almacen(): BelongsTo
    {
        return $this->belongsTo(Almacen::class, 'almacen_id');
    }

    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class, 'material_id');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }
}
