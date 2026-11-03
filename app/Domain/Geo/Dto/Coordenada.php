<?php

namespace App\Domain\Geo\Dto;

final readonly class Coordenada
{
    public function __construct(
        public float $lat,
        public float $lng,
    ) {}

    /**
     * @return array{lat: float, lng: float}
     */
    public function toArray(): array
    {
        return ['lat' => $this->lat, 'lng' => $this->lng];
    }
}
