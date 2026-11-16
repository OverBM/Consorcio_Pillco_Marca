<?php

namespace App\Models;

use App\Models\Concerns\BelongsToAlmacenYMaterial;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Merma extends Model
{
    use BelongsToAlmacenYMaterial;
    use HasFactory;

    protected $table = 'mermas';

    protected $fillable = [
        'almacen_id',
        'material_id',
        'lote_id',
        'transferencia_id',
        'cantidad',
        'causa',
        'justificacion',
        'estado',
        'registrada_por',
        'aprobada_por',
        'aprobada_en',
    ];

    protected $casts = [
        'cantidad' => 'decimal:3',
        'aprobada_en' => 'datetime',
    ];

    public function lote(): BelongsTo
    {
        return $this->belongsTo(Lote::class, 'lote_id');
    }

    public function registrador(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'registrada_por');
    }

    public function aprobador(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'aprobada_por');
    }
}
