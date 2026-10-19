<?php

namespace App\Enums;

/**
 * Estados posibles de una fase del ciclo de vida de obra.
 */
enum EstadoFase: string
{
    case Pendiente = 'pendiente';
    case EnProceso = 'en_proceso';
    case Aprobada = 'aprobada';
    case Rechazada = 'rechazada';

    public function etiqueta(): string
    {
        return match ($this) {
            self::Pendiente => 'Pendiente',
            self::EnProceso => 'En proceso',
            self::Aprobada => 'Aprobada',
            self::Rechazada => 'Rechazada',
        };
    }

    /**
     * @return array<int, string>
     */
    public static function valores(): array
    {
        return array_map(fn (self $estado) => $estado->value, self::cases());
    }
}
