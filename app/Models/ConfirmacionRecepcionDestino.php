<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ConfirmacionRecepcionDestino extends Model
{
    use HasFactory;

    protected $table = 'confirmaciones_recepcion_destino';

    protected $fillable = [
        'transferencia_id',
        'almacenero_id',
        'recibida_en',
        'firma_ruta',
        'foto_ruta',
        'hay_diferencias',
        'observaciones',
        'ubicacion_recepcion',
    ];

    protected $casts = [
        'recibida_en' => 'datetime',
        'hay_diferencias' => 'boolean',
    ];

    public function transferencia(): BelongsTo
    {
        return $this->belongsTo(Transferencia::class, 'transferencia_id');
    }

    public function almacenero(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'almacenero_id');
    }
}
