<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Valorizacion extends Model
{
    use Auditable;
    use HasFactory;

    protected $table = 'valorizaciones';

    protected $fillable = [
        'obra_id',
        'periodo',
        'valor_planificado',
        'valor_ganado',
        'costo_real',
        'estado',
        'aprobada_por',
    ];

    protected $casts = [
        'periodo' => 'date',
        'valor_planificado' => 'decimal:2',
        'valor_ganado' => 'decimal:2',
        'costo_real' => 'decimal:2',
    ];

    public function obra(): BelongsTo
    {
        return $this->belongsTo(Obra::class, 'obra_id');
    }

    public function aprobador(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'aprobada_por');
    }
}
