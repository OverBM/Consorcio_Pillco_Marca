<?php

namespace App\Enums;

enum EstadoAlerta: string
{
    case Abierta = 'abierta';
    case Reconocida = 'reconocida';
    case Resuelta = 'resuelta';
    case Vigente = 'vigente';

    /**
     * @return list<string>
     */
    public static function valores(): array
    {
        return array_map(fn (self $estado) => $estado->value, self::cases());
    }
}
