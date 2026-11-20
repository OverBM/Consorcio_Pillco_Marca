<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EjecucionAnalitica extends Model
{
    protected $table = 'ejecuciones_analitica';

    protected $fillable = [
        'origen',
        'estado',
        'inicio',
        'fin',
        'duracion_ms',
        'series',
        'calculadas',
        'alertas',
        'errores',
        'mensaje',
    ];

    protected function casts(): array
    {
        return [
            'inicio' => 'datetime',
            'fin' => 'datetime',
        ];
    }

    public static function marcarExpiradas(int $minutos = 5): int
    {
        $ahora = now();

        $expiradas = static::query()
            ->where('estado', 'en_proceso')
            ->where('inicio', '<', $ahora->copy()->subMinutes($minutos))
            ->get();

        foreach ($expiradas as $ejecucion) {
            $ejecucion->update([
                'estado' => 'fallida',
                'fin' => $ahora,
                'duracion_ms' => $ejecucion->inicio !== null
                    ? (int) $ejecucion->inicio->diffInMilliseconds($ahora)
                    : null,
                'errores' => 1,
                'mensaje' => 'Ejecución interrumpida o expirada.',
            ]);
        }

        return $expiradas->count();
    }
}
