<?php

namespace App\Support;

use App\Models\Alerta;
use App\Models\AlertaLeida;
use App\Models\Notificacion;
use App\Models\Usuario;

/**
 * Construye el feed fusionado de notificaciones personales y alertas operativas.
 */
final class NotificacionesFeed
{
    public const LIMITE = 20;

    /**
     * @return array{items: list<array<string, mixed>>, sin_leer: int}
     */
    public static function paraUsuario(Usuario $usuario): array
    {
        $leidas = AlertaLeida::query()
            ->where('usuario_id', $usuario->id)
            ->pluck('alerta_id')
            ->all();

        $notificaciones = Notificacion::query()
            ->where('usuario_id', $usuario->id)
            ->latest()
            ->limit(self::LIMITE)
            ->get()
            ->map(fn (Notificacion $notificacion) => [
                'id' => 'notificacion-'.$notificacion->id,
                'origen' => 'notificacion',
                'tipo' => $notificacion->tipo,
                'titulo' => $notificacion->titulo,
                'cuerpo' => $notificacion->cuerpo,
                'severidad' => null,
                'referencia_tipo' => $notificacion->referencia_tipo,
                'referencia_id' => $notificacion->referencia_id,
                'leida' => $notificacion->leida_en !== null,
                'fecha' => $notificacion->created_at?->toIso8601String(),
            ]);

        $alertas = Alerta::query()
            ->where('estado', 'abierta')
            ->latest()
            ->limit(self::LIMITE)
            ->get()
            ->map(fn (Alerta $alerta) => [
                'id' => 'alerta-'.$alerta->id,
                'origen' => 'alerta',
                'tipo' => $alerta->tipo,
                'titulo' => $alerta->tipo,
                'cuerpo' => $alerta->mensaje,
                'severidad' => $alerta->severidad,
                'referencia_tipo' => $alerta->referencia_tipo,
                'referencia_id' => $alerta->referencia_id,
                'leida' => in_array($alerta->id, $leidas, true),
                'fecha' => $alerta->created_at?->toIso8601String(),
            ]);

        $items = $notificaciones
            ->concat($alertas)
            ->sortByDesc('fecha')
            ->values()
            ->all();

        return [
            'items' => $items,
            'sin_leer' => count(array_filter($items, fn (array $item) => ! $item['leida'])),
        ];
    }
}
