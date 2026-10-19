<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SolicitudAcceso extends Model
{
    use Auditable;

    public const ESTADO_PENDIENTE = 'pendiente';

    public const ESTADO_APROBADA = 'aprobada';

    public const ESTADO_RECHAZADA = 'rechazada';

    protected $table = 'solicitudes_acceso';

    protected $fillable = [
        'nombre_completo',
        'email',
        'dni',
        'telefono',
        'empresa',
        'ruc',
        'cargo',
        'rol_solicitado',
        'motivo',
        'estado',
        'revisado_por',
        'revisado_en',
        'notas_revision',
        'ip',
    ];

    protected function casts(): array
    {
        return [
            'revisado_en' => 'datetime',
        ];
    }

    public function revisor(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'revisado_por');
    }

    public function scopePendientes($query)
    {
        return $query->where('estado', self::ESTADO_PENDIENTE);
    }
}
