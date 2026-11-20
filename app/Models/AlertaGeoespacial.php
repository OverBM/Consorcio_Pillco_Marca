<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AlertaGeoespacial extends Model
{
    private const TIPOS = [
        'salida_geocerca',
        'sin_senal_tracking',
        'detencion_prolongada',
        'eta_vencida',
        'geoespacial',
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
        'despacho_id',
        'distancia_m',
        'tiempo_min',
        'detalle',
    ];

    protected $appends = [
        'despacho_id',
        'distancia_m',
        'tiempo_min',
        'detalle',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope('geoespacial', function (Builder $query): void {
            $query->whereIn($query->getModel()->getTable().'.tipo', self::TIPOS);
        });

        static::creating(function (self $alerta): void {
            if (! isset($alerta->attributes['mensaje'])) {
                $alerta->attributes['mensaje'] = 'Alerta geoespacial';
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

    public function getDespachoIdAttribute(): ?int
    {
        return isset($this->attributes['transferencia_id']) ? (int) $this->attributes['transferencia_id'] : null;
    }

    public function setDespachoIdAttribute(?int $value): void
    {
        $this->attributes['transferencia_id'] = $value;
    }

    public function getDetalleAttribute(): ?string
    {
        return $this->attributes['mensaje'] ?? null;
    }

    public function setDetalleAttribute(?string $value): void
    {
        $this->attributes['mensaje'] = $value;
    }

    public function getDistanciaMAttribute(): ?float
    {
        return isset($this->payload['distancia_m']) ? (float) $this->payload['distancia_m'] : null;
    }

    public function setDistanciaMAttribute(?float $value): void
    {
        $this->mergePayload('distancia_m', $value);
    }

    public function getTiempoMinAttribute(): ?float
    {
        return isset($this->payload['tiempo_min']) ? (float) $this->payload['tiempo_min'] : null;
    }

    public function setTiempoMinAttribute(?float $value): void
    {
        $this->mergePayload('tiempo_min', $value);
    }

    public function despacho(): BelongsTo
    {
        return $this->belongsTo(Transferencia::class, 'transferencia_id');
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
