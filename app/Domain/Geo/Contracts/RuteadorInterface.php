<?php

namespace App\Domain\Geo\Contracts;

use App\Domain\Geo\Dto\Coordenada;
use App\Domain\Geo\Dto\RutaCalculada;

interface RuteadorInterface
{
    public function calcular(Coordenada $origen, Coordenada $destino, string $perfil = 'car'): RutaCalculada;

    public function nombre(): string;
}
