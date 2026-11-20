<?php

namespace App\Enums;

enum EstadoOrdenCompra: string
{
    case Emitida = 'emitida';
    case ConfirmadaProveedor = 'confirmada_proveedor';
    case EnTransporte = 'en_transporte';
    case RecepcionadaTotal = 'recepcionada_total';
    case RecepcionadaParcial = 'recepcionada_parcial';
    case Anulada = 'anulada';
    case Recibida = 'recibida';
    case Parcial = 'parcial';

    /**
     * @return list<string>
     */
    public static function valores(): array
    {
        return array_map(fn (self $estado) => $estado->value, self::cases());
    }
}
