<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransferenciaDetalle extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'transferencia_detalles';

    protected $fillable = [
        'transferencia_id',
        'material_id',
        'lote_id',
        'cantidad_solicitada',
        'cantidad_despachada',
        'cantidad_recibida',
    ];

    protected $casts = [
        'cantidad_solicitada' => 'decimal:3',
        'cantidad_despachada' => 'decimal:3',
        'cantidad_recibida' => 'decimal:3',
    ];

    public function transferencia(): BelongsTo
    {
        return $this->belongsTo(Transferencia::class, 'transferencia_id');
    }

    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class, 'material_id');
    }

    public function lote(): BelongsTo
    {
        return $this->belongsTo(Lote::class, 'lote_id');
    }
}
