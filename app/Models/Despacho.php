<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Despacho extends Model
{
    use HasFactory;

    protected $table = 'despachos';

    protected $fillable = [
        'transferencia_id',
        'despachado_por',
        'despachado_en',
        'observaciones',
        'ubicacion_despacho',
    ];

    protected $casts = [
        'despachado_en' => 'datetime',
    ];

    public function transferencia(): BelongsTo
    {
        return $this->belongsTo(Transferencia::class, 'transferencia_id');
    }

    public function despachador(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'despachado_por');
    }
}
