<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ObservacionTecnica extends Model
{
    use HasFactory;

    protected $table = 'observaciones_tecnicas';

    protected $fillable = [
        'obra_id',
        'numero_acta',
        'descripcion',
        'origen',
        'plazo_subsanacion',
        'responsable_id',
        'estado',
        'acta_levantamiento_id',
        'planos_asbuilt_actualizados',
    ];

    protected $casts = [
        'plazo_subsanacion' => 'date',
        'planos_asbuilt_actualizados' => 'boolean',
    ];

    public function obra(): BelongsTo
    {
        return $this->belongsTo(Obra::class, 'obra_id');
    }

    public function responsable(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'responsable_id');
    }

    public function evidencias(): HasMany
    {
        return $this->hasMany(ObservacionEvidencia::class, 'observacion_id');
    }
}
