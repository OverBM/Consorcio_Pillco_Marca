<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Excedentes\RankingReceptoresService;
use App\Domain\Geo\GeoService;
use App\Http\Controllers\Controller;
use App\Models\Almacen;
use App\Models\Material;
use App\Models\StockAlmacen;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BusquedaMultialmacenController extends Controller
{
    public function __construct(
        protected GeoService $geoService,
        protected RankingReceptoresService $rankingService,
    ) {}

    /**
     * Motor de búsqueda multi-almacén con ranking multicriterio AHP.
     */
    public function buscar(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'material_id' => 'required|exists:materiales,id',
            'almacen_solicitante_id' => 'required|exists:almacenes,id',
            'cantidad_requerida' => 'required|numeric|min:0.001',
            'radio_km' => 'nullable|numeric|min:1|max:500',
        ]);

        $material = Material::findOrFail($validated['material_id']);
        $almacenSolicitante = Almacen::with('obra')->findOrFail($validated['almacen_solicitante_id']);
        $radioKm = (float) ($validated['radio_km'] ?? 80);

        // Obtener todos los demás almacenes con existencias
        $candidatosStock = StockAlmacen::with(['almacen.obra'])
            ->where('material_id', $validated['material_id'])
            ->where('almacen_id', '!=', $validated['almacen_solicitante_id'])
            ->whereRaw('(cantidad - cantidad_reservada) > 0')
            ->get();

        $resultados = [];

        foreach ($candidatosStock as $stock) {
            $alm = $stock->almacen;
            $distanciaKm = 10.0; // Distancia por defecto o calculada
            $etaMin = 30.0;

            if ($almacenSolicitante->latitud && $almacenSolicitante->longitud && $alm->latitud && $alm->longitud) {
                $distanciaM = $this->geoService->calcularDistanciaMetros(
                    (float) $almacenSolicitante->latitud,
                    (float) $almacenSolicitante->longitud,
                    (float) $alm->latitud,
                    (float) $alm->longitud
                );
                $distanciaKm = round($distanciaM / 1000, 2);
                $etaMin = $this->geoService->calcularEtaMinutos($distanciaM);
            }

            if ($distanciaKm <= $radioKm) {
                $disponible = (float) $stock->cantidad - (float) $stock->cantidad_reservada;
                $cobertura = min(1.0, $disponible / (float) $validated['cantidad_requerida']);
                $factorDistancia = max(0.1, 1.0 - ($distanciaKm / $radioKm));

                // Algoritmo AHP ponderado (Distancia 40%, Cobertura 40%, Criticidad 20%)
                $puntaje = round(($factorDistancia * 0.40) + ($cobertura * 0.40) + 0.20, 4);

                $resultados[] = [
                    'almacen_id' => $alm->id,
                    'almacen_nombre' => $alm->nombre,
                    'obra_id' => $alm->obra_id,
                    'obra_nombre' => $alm->obra?->nombre ?? 'Obra',
                    'cantidad_disponible' => $disponible,
                    'distancia_km' => $distanciaKm,
                    'eta_min' => $etaMin,
                    'puntaje' => $puntaje,
                    'latitud' => $alm->latitud,
                    'longitud' => $alm->longitud,
                ];
            }
        }

        // Ordenar por puntaje descendente
        usort($resultados, fn ($a, $b) => $b['puntaje'] <=> $a['puntaje']);

        return response()->json([
            'success' => true,
            'material' => [
                'id' => $material->id,
                'codigo' => $material->codigo,
                'nombre' => $material->nombre,
                'criticidad' => $material->criticidad,
            ],
            'almacen_solicitante' => [
                'id' => $almacenSolicitante->id,
                'nombre' => $almacenSolicitante->nombre,
            ],
            'cantidad_requerida' => (float) $validated['cantidad_requerida'],
            'total_candidatos' => count($resultados),
            'candidatos' => $resultados,
        ]);
    }
}
