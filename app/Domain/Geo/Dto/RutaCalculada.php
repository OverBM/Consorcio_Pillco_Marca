<?php

namespace App\Domain\Geo\Dto;

final readonly class RutaCalculada
{
    /**
     * @param  list<array{lat: float, lng: float}>  $geometria
     */
    public function __construct(
        public float $distanciaM,
        public float $duracionS,
        public array $geometria,
        public string $fuente,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'distancia_m' => round($this->distanciaM, 1),
            'duracion_s' => round($this->duracionS, 1),
            'geometria' => $this->geometria,
            'fuente' => $this->fuente,
        ];
    }
}
