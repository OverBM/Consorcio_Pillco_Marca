<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DevolucionDetalle extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'devolucion_detalles';

    protected $fillable = [
        'devolucion_id',
        'material_id',
        'lote_id',
        'cantidad',
    ];

    protected $casts = [
        'cantidad' => 'decimal:3',
    ];

    public function devolucion(): BelongsTo
    {
        return $this->belongsTo(DevolucionProveedor::class, 'devolucion_id');
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
