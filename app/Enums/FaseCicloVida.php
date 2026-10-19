<?php

namespace App\Enums;

/**
 * Fases canónicas del ciclo de vida de una obra (PMI / PMU).
 *
 * Fuente única de verdad para backend; el frontend replica esta secuencia en
 * `resources/js/utils/cicloVida.ts`.
 */
enum FaseCicloVida: string
{
    case Inicio = 'inicio';
    case Planificacion = 'planificacion';
    case Ejecucion = 'ejecucion';
    case MonitoreoControl = 'monitoreo_control';
    case Cierre = 'cierre';

    public function etiqueta(): string
    {
        return match ($this) {
            self::Inicio => 'Inicio',
            self::Planificacion => 'Planificación',
            self::Ejecucion => 'Ejecución',
            self::MonitoreoControl => 'Monitoreo y Control',
            self::Cierre => 'Cierre de Obra',
        };
    }

    public function responsable(): string
    {
        return match ($this) {
            self::Inicio => 'Gerente General / PMU',
            self::Planificacion => 'Oficina Técnica / Residente',
            self::Ejecucion => 'Residente / Maestro de Obra',
            self::MonitoreoControl => 'Área Técnica / Supervisión',
            self::Cierre => 'Consorcio / Entidad Contratante',
        };
    }

    public function orden(): int
    {
        return array_search($this->value, self::valores(), true) + 1;
    }

    /**
     * Fase inmediata anterior de la secuencia canónica.
     */
    public function anterior(): ?self
    {
        $valores = self::valores();
        $indice = array_search($this->value, $valores, true);

        return $indice > 0 ? self::from($valores[$indice - 1]) : null;
    }

    /**
     * @return array<int, string>
     */
    public static function valores(): array
    {
        return [
            self::Inicio->value,
            self::Planificacion->value,
            self::Ejecucion->value,
            self::MonitoreoControl->value,
            self::Cierre->value,
        ];
    }

    /**
     * @return array<int, array{codigo: string, nombre: string, responsable: string, orden: int}>
     */
    public static function secuencia(): array
    {
        return array_map(fn (self $fase) => [
            'codigo' => $fase->value,
            'nombre' => $fase->etiqueta(),
            'responsable' => $fase->responsable(),
            'orden' => $fase->orden(),
        ], self::cases());
    }
}
