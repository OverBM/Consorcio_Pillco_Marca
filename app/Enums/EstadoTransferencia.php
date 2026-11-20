<?php

namespace App\Enums;

enum EstadoTransferencia: string
{
    case Sugerida = 'sugerida';
    case Solicitada = 'solicitada';
    case Aprobada = 'aprobada';
    case EnTransito = 'en_transito';
    case Completada = 'completada';
    case Anulada = 'anulada';

    /**
     * @return list<string>
     */
    public static function valores(): array
    {
        return array_map(fn (self $estado) => $estado->value, self::cases());
    }
}
