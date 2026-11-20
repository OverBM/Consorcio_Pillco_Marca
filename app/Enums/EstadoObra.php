<?php

namespace App\Enums;

enum EstadoObra: string
{
    case Planificacion = 'planificacion';
    case Ejecucion = 'ejecucion';
    case Cierre = 'cierre';
    case Liquidada = 'liquidada';
    case Cerrada = 'cerrada';

    /**
     * @return list<string>
     */
    public static function valores(): array
    {
        return array_map(fn (self $estado) => $estado->value, self::cases());
    }
}
