<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlanillaDetalle extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'planilla_detalles';

    protected $fillable = [
        'planilla_id',
        'trabajador_id',
        'dias_laborados',
        'horas_totales',
        'monto',
    ];

    protected $casts = [
        'dias_laborados' => 'integer',
        'horas_totales' => 'decimal:2',
        'monto' => 'decimal:2',
    ];

    public function planilla(): BelongsTo
    {
        return $this->belongsTo(Planilla::class, 'planilla_id');
    }

    public function trabajador(): BelongsTo
    {
        return $this->belongsTo(Trabajador::class, 'trabajador_id');
    }
}
