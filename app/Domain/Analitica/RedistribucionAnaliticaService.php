<?php

namespace App\Domain\Analitica;

use App\Domain\Geo\Drivers\HaversineDriver;
use App\Domain\Geo\Dto\Coordenada;
use App\Models\ParametroInventario;
use App\Models\StockAlmacen;

/**
 * Sugerencias de redistribución multi-almacén basadas en los parámetros
 * calculados por el motor: almacenes con exceso de un material alimentan a
 * almacenes por debajo del punto de reorden.
 */
class RedistribucionAnaliticaService
{
    public function __construct(private readonly HaversineDriver $haversine) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function sugerencias(?int $almacenId = null, ?int $obraId = null, int $limite = 8): array
    {
        $parametros = ParametroInventario::query()
            ->where('vigente', true)
            ->with([
                'almacen:id,nombre,obra_id,latitud,longitud',
                'material:id,codigo,nombre,unidad_id,categoria_id',
                'material.unidad:id,codigo',
                'material.categoria:id,nombre',
            ])
            ->get();

        $stock = StockAlmacen::query()
            ->whereIn('almacen_id', $parametros->pluck('almacen_id')->unique())
            ->get()
            ->keyBy(fn (StockAlmacen $fila): string => $fila->almacen_id.':'.$fila->material_id);

        $obraPorAlmacen = $parametros
            ->mapWithKeys(fn (ParametroInventario $parametro): array => [
                $parametro->almacen_id => (int) ($parametro->almacen?->obra_id ?? 0),
            ]);

        $sugerencias = [];

        foreach ($parametros->groupBy('material_id') as $materialId => $grupo) {
            $sobrantes = [];
            $deficits = [];

            foreach ($grupo as $parametro) {
                $posicion = $stock->get($parametro->almacen_id.':'.$materialId);
                $cantidad = (float) ($posicion?->cantidad ?? 0);
                $rop = (float) ($parametro->punto_reorden ?? 0);

                if ($rop <= 0) {
                    continue;
                }

                if ($cantidad > $rop) {
                    $sobrantes[] = [
                        'parametro' => $parametro,
                        'cantidad' => $cantidad,
                        'exceso' => $cantidad - $rop,
                    ];
                } elseif ($cantidad < $rop) {
                    $deficits[] = [
                        'parametro' => $parametro,
                        'cantidad' => $cantidad,
                        'faltante' => $rop - $cantidad,
                    ];
                }
            }

            foreach ($deficits as $deficit) {
                foreach ($sobrantes as $sobrante) {
                    if ($sobrante['parametro']->almacen_id === $deficit['parametro']->almacen_id) {
                        continue;
                    }

                    $origen = $sobrante['parametro']->almacen;
                    $destino = $deficit['parametro']->almacen;

                    if ($origen === null || $destino === null) {
                        continue;
                    }

                    $cantidad = round(min($sobrante['exceso'], $deficit['faltante']), 3);

                    if ($cantidad <= 0) {
                        continue;
                    }

                    $material = $deficit['parametro']->material;

                    $sugerencias[] = [
                        'material_id' => (int) $materialId,
                        'material' => $material?->nombre,
                        'codigo' => $material?->codigo,
                        'unidad' => $material?->unidad?->codigo ?? 'UND',
                        'categoria' => $material?->categoria?->nombre,
                        'origen_id' => $origen->id,
                        'origen' => $origen->nombre,
                        'origen_stock' => round($sobrante['cantidad'], 3),
                        'origen_rop' => round((float) ($sobrante['parametro']->punto_reorden ?? 0), 3),
                        'destino_id' => $destino->id,
                        'destino' => $destino->nombre,
                        'destino_stock' => round($deficit['cantidad'], 3),
                        'destino_rop' => round((float) ($deficit['parametro']->punto_reorden ?? 0), 3),
                        'cantidad' => $cantidad,
                        'prioridad' => $deficit['faltante'] >= $sobrante['exceso'] ? 'alta' : 'media',
                        'distancia_km' => null,
                        'eta_min' => null,
                        'geometria' => [],
                        'url' => '/transferencias?crear=sobrante&materialId='.$materialId
                            .'&origen='.$origen->id.'&destino='.$destino->id
                            .'&cantidad='.$cantidad,
                    ];

                    $indice = array_key_last($sugerencias);

                    if ($origen->latitud !== null && $origen->longitud !== null
                        && $destino->latitud !== null && $destino->longitud !== null) {
                        $ruta = $this->haversine->calcular(
                            new Coordenada((float) $origen->latitud, (float) $origen->longitud),
                            new Coordenada((float) $destino->latitud, (float) $destino->longitud),
                        );

                        $sugerencias[$indice]['distancia_km'] = round($ruta->distanciaM / 1000, 2);
                        $sugerencias[$indice]['eta_min'] = round($ruta->duracionS / 60, 1);
                        $sugerencias[$indice]['geometria'] = $ruta->geometria;
                    }
                }
            }
        }

        if ($almacenId !== null) {
            $sugerencias = array_values(array_filter(
                $sugerencias,
                fn (array $sugerencia): bool => $sugerencia['origen_id'] === $almacenId
                    || $sugerencia['destino_id'] === $almacenId,
            ));
        } elseif ($obraId !== null) {
            $sugerencias = array_values(array_filter(
                $sugerencias,
                fn (array $sugerencia): bool => ($obraPorAlmacen[$sugerencia['origen_id']] ?? 0) === $obraId
                    || ($obraPorAlmacen[$sugerencia['destino_id']] ?? 0) === $obraId,
            ));
        }

        usort(
            $sugerencias,
            fn (array $a, array $b): int => [$a['prioridad'] === 'alta' ? 0 : 1, $a['eta_min'] ?? INF]
                <=> [$b['prioridad'] === 'alta' ? 0 : 1, $b['eta_min'] ?? INF],
        );

        return array_slice($sugerencias, 0, $limite);
    }
}
