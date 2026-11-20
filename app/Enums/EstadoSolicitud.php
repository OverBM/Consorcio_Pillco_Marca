<?php

namespace App\Enums;

enum EstadoSolicitud: string
{
    case Registrada = 'registrada';
    case Atendida = 'atendida';
    case Anulada = 'anulada';
    case Borrador = 'borrador';
    case Solicitado = 'solicitado';
    case Aprobado = 'aprobado';
    case Rechazado = 'rechazado';
    case Atendido = 'atendido';
    case Cerrado = 'cerrado';

    /**
     * @return list<string>
     */
    public static function valores(): array
    {
        return array_map(fn (self $estado) => $estado->value, self::cases());
    }
}
