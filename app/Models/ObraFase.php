<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ObraFase extends Model
{
    use Auditable;
    use HasFactory;

    protected $table = 'obra_fases';

    protected $fillable = [
        'obra_id',
        'fase',
        'estado',
        'aprobada_por',
        'aprobada_en',
        'observaciones',
    ];

    protected $casts = [
        'aprobada_en' => 'datetime',
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
