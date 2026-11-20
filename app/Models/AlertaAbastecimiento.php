<?php

namespace App\Models;

use App\Models\Concerns\BelongsToAlmacenYMaterial;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AlertaAbastecimiento extends Model
{
    use BelongsToAlmacenYMaterial;

    private const TIPOS = [
        'bajo_punto_reorden',
        'baja_confianza',
        'parametros_incompletos',
        'quiebre_proyectado',
        'abastecimiento',
    ];

    protected $table = 'alertas';

    protected $fillable = [
        'obra_id',
        'almacen_id',
        'material_id',
        'transferencia_id',
        'tipo',
        'severidad',
        'mensaje',
        'payload',
        'clave_idempotente',
        'referencia_tipo',
        'referencia_id',
        'estado',
        'reconocida_por',
        'reconocida_en',
        'detalle',
        'fecha_estimada',
        'cantidad_sugerida',
    ];

    protected $appends = [
        'detalle',
        'fecha_estimada',
        'cantidad_sugerida',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope('abastecimiento', function (Builder $query): void {
            $query->whereIn($query->getModel()->getTable().'.tipo', self::TIPOS);
        });

        static::creating(function (self $alerta): void {
            if (! isset($alerta->attributes['mensaje'])) {
                $alerta->attributes['mensaje'] = 'Alerta de abastecimiento';
            }

            if (! isset($alerta->attributes['estado'])) {
                $alerta->attributes['estado'] = 'vigente';
            }
        });
    }

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'reconocida_en' => 'datetime',
        ];
    }

    /**
     * Expresión portable para leer la fecha estimada desde payload.
     */
    public static function fechaEstimadaExpresion(Builder $query): string
    {
        return match ($query->getConnection()->getDriverName()) {
            'pgsql' => "payload->>'fecha_estimada'",
            'sqlite' => 'json_extract(payload, \'$.fecha_estimada\')',
            default => 'json_unquote(json_extract(payload, \'$.fecha_estimada\'))',
        };
    }

    public function scopeQuiebresHasta(Builder $query, string $fecha): Builder
    {
        return $query
            ->where('estado', 'vigente')
            ->where('tipo', 'quiebre_proyectado')
            ->whereRaw(self::fechaEstimadaExpresion($query).' <= ?', [$fecha]);
    }

    public function scopeOrdenarPorFechaEstimada(Builder $query): Builder
    {
        $expresion = self::fechaEstimadaExpresion($query);

        return $query->orderByRaw(
            "CASE WHEN {$expresion} IS NULL THEN 1 ELSE 0 END, {$expresion}"
        );
    }

    public function getDetalleAttribute(): ?string
    {
        return $this->attributes['mensaje'] ?? null;
    }

    public function setDetalleAttribute(?string $value): void
    {
        $this->attributes['mensaje'] = $value;
    }

    public function getFechaEstimadaAttribute(): ?string
    {
        return $this->payload['fecha_estimada'] ?? null;
    }

    public function setFechaEstimadaAttribute(?string $value): void
    {
        $this->mergePayload('fecha_estimada', $value);
    }

    public function getCantidadSugeridaAttribute(): ?float
    {
        return isset($this->payload['cantidad_sugerida']) ? (float) $this->payload['cantidad_sugerida'] : null;
    }

    public function setCantidadSugeridaAttribute(?float $value): void
    {
        $this->mergePayload('cantidad_sugerida', $value);
    }

    public function reconocidaPor(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'reconocida_por');
    }

    private function mergePayload(string $key, mixed $value): void
    {
        $payload = $this->attributes['payload'] ?? [];
        $payload = is_string($payload) ? (json_decode($payload, true) ?: []) : $payload;
        $payload[$key] = $value;
        $this->attributes['payload'] = json_encode($payload);
    }
}
