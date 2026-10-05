<?php

namespace App\Domain\Optimization;

use App\Domain\Geo\GeoService;
use App\Models\Material;
use App\Models\Obra;
use App\Models\ParametroSistema;
use App\Models\StockAlmacen;

class AhpOptimizationService
{
    public function __construct(
        protected GeoService $geoService
    ) {}

    /**
     * Calcula y clasifica las transferencias inter-almacén óptimas mediante AHP geolocalizado.
     *
     * @return array<int, array<string, mixed>>
     */
    public function calcularRankingTransferencias(
        Obra|int $obraDestino,
        Material|int $material,
        float $cantidadRequerida
    ): array {
        $obraDestino = is_int($obraDestino) ? Obra::find($obraDestino) : $obraDestino;
        $material = is_int($material) ? Material::find($material) : $material;

        if (! $obraDestino || ! $material || $cantidadRequerida <= 0) {
            return [];
        }

        // Cargar ponderaciones AHP desde base de datos
        $pesoDistancia = (float) (ParametroSistema::where('clave', 'ahp.peso_distancia')->value('valor') ?? 0.40);
        $pesoCobertura = (float) (ParametroSistema::where('clave', 'ahp.peso_cobertura')->value('valor') ?? 0.40);
        $pesoCriticidad = (float) (ParametroSistema::where('clave', 'ahp.peso_criticidad')->value('valor') ?? 0.20);
        $radioMaxKm = (float) (ParametroSistema::where('clave', 'geo.radio_maximo_km')->value('valor') ?? 80.0);

        // Buscar almacenes con stock disponible (excluyendo los almacenes de la obra destino)
        $almacenesDestinoIds = $obraDestino->almacenes()->pluck('id')->toArray();

        $candidatosStock = StockAlmacen::with(['almacen.obra'])
            ->where('material_id', $material->id)
            ->whereNotIn('almacen_id', $almacenesDestinoIds)
            ->where('cantidad', '>', 0)
            ->get();

        $resultados = [];
        $costoUnitario = (float) ($material->costo_referencial ?? 35.0);

        $latDestino = (float) ($obraDestino->latitud ?? -12.0650);
        $lngDestino = (float) ($obraDestino->longitud ?? -75.2100);

        foreach ($candidatosStock as $stockItem) {
            $almacenOrigen = $stockItem->almacen;
            if (! $almacenOrigen) {
                continue;
            }

            $latOrigen = (float) ($almacenOrigen->latitud ?? -12.0450);
            $lngOrigen = (float) ($almacenOrigen->longitud ?? -75.2280);

            // 1. Distancia geodésica con factor de ruta
            $distanciaLinealM = $this->geoService->calcularDistanciaMetros($latOrigen, $lngOrigen, $latDestino, $lngDestino);
            $distanciaKm = round(($distanciaLinealM * 1.35) / 1000.0, 2);

            if ($distanciaKm > $radioMaxKm) {
                continue; // Supera radio admisible
            }

            $tiempoMin = $this->geoService->calcularEtaMinutos($distanciaLinealM);

            // 2. Normalización de criterios
            $stockDisponible = max(0, (float) $stockItem->cantidad - (float) $stockItem->cantidad_reservada);
            $scoreDistancia = max(0.0, 1.0 - ($distanciaKm / max(1.0, $radioMaxKm)));
            $scoreCobertura = min(1.0, $stockDisponible / $cantidadRequerida);
            $scoreCriticidad = match ($material->criticidad ?? 'normal') {
                'critica' => 1.0,
                'alta' => 0.75,
                default => 0.50,
            };

            // 3. Puntaje compuesto AHP (0 a 100)
            $puntajeAhp = round(
                (($pesoDistancia * $scoreDistancia) +
                 ($pesoCobertura * $scoreCobertura) +
                 ($pesoCriticidad * $scoreCriticidad)) * 100.0,
                1
            );

            // 4. Ahorro económico proyectado
            $cantidadTransferible = min($cantidadRequerida, $stockDisponible);
            $costoFleteEstimado = round(50.0 + ($distanciaKm * 3.5), 2);
            $ahorroProyectado = max(0.0, ($cantidadTransferible * $costoUnitario) - $costoFleteEstimado);

            $resultados[] = [
                'almacenOrigenId' => (string) $almacenOrigen->id,
                'almacenOrigenNombre' => $almacenOrigen->nombre,
                'obraOrigenNombre' => $almacenOrigen->obra?->nombre ?? 'Obra',
                'materialId' => (string) $material->id,
                'materialNombre' => $material->nombre,
                'stockDisponible' => $stockDisponible,
                'cantidadSugerida' => $cantidadTransferible,
                'unidad' => $material->unidadMedida?->codigo ?? 'UND',
                'distanciaKm' => $distanciaKm,
                'tiempoEstimadoMin' => $tiempoMin,
                'puntajeAhp' => $puntajeAhp,
                'ahorroEstimadoSoles' => $ahorroProyectado,
                'prioridad' => $puntajeAhp >= 75.0 ? 'alta' : ($puntajeAhp >= 50.0 ? 'media' : 'baja'),
            ];
        }

        // Ordenar por puntaje AHP descendente
        usort($resultados, fn ($a, $b) => $b['puntajeAhp'] <=> $a['puntajeAhp']);

        return $resultados;
    }
}
