<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Geo\Dto\Coordenada;
use App\Domain\Geo\GeocodificacionService;
use App\Domain\Geo\OptimizacionRutaService;
use App\Domain\Geo\RuteoService;
use App\Http\Controllers\Controller;
use App\Models\Almacen;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GeoController extends Controller
{
    public function ruta(Request $request, RuteoService $ruteo): JsonResponse
    {
        $datos = $request->validate([
            'origen.lat' => 'required|numeric|between:-90,90',
            'origen.lng' => 'required|numeric|between:-180,180',
            'destino.lat' => 'required|numeric|between:-90,90',
            'destino.lng' => 'required|numeric|between:-180,180',
            'perfil' => 'nullable|in:car,bike,foot',
        ]);

        $ruta = $ruteo->calcular(
            new Coordenada((float) $datos['origen']['lat'], (float) $datos['origen']['lng']),
            new Coordenada((float) $datos['destino']['lat'], (float) $datos['destino']['lng']),
            (string) ($datos['perfil'] ?? 'car'),
        );

        return response()->json([
            'success' => true,
            'data' => $ruta->toArray(),
        ]);
    }

    public function optimizar(Request $request, OptimizacionRutaService $optimizacion): JsonResponse
    {
        $datos = $request->validate([
            'origen.lat' => 'required|numeric|between:-90,90',
            'origen.lng' => 'required|numeric|between:-180,180',
            'paradas' => 'required|array|min:1|max:20',
            'paradas.*.lat' => 'required|numeric|between:-90,90',
            'paradas.*.lng' => 'required|numeric|between:-180,180',
            'perfil' => 'nullable|in:car,bike,foot',
        ], [
            'paradas.max' => 'El máximo es de 20 paradas por solicitud.',
        ]);

        $paradas = array_map(
            fn (array $punto): Coordenada => new Coordenada((float) $punto['lat'], (float) $punto['lng']),
            $datos['paradas'],
        );

        return response()->json([
            'success' => true,
            'data' => $optimizacion->optimizar(
                new Coordenada((float) $datos['origen']['lat'], (float) $datos['origen']['lng']),
                $paradas,
                (string) ($datos['perfil'] ?? 'car'),
            ),
        ]);
    }

    public function geocodificar(Request $request, GeocodificacionService $servicio): JsonResponse
    {
        $datos = $request->validate([
            'direccion' => 'required|string|min:5|max:240',
        ]);

        $resultado = $servicio->geocodificar($datos['direccion']);

        if ($resultado === null) {
            return response()->json([
                'success' => false,
                'message' => 'No se pudo geocodificar la dirección.',
            ], 422);
        }

        return response()->json(['success' => true, 'data' => $resultado]);
    }

    public function actualizarAlmacen(Request $request, Almacen $almacen): JsonResponse
    {
        $datos = $request->validate([
            'radio_geocerca_m' => 'sometimes|numeric|min:10|max:5000',
            'lat' => 'sometimes|numeric|between:-90,90',
            'lng' => 'sometimes|numeric|between:-180,180',
        ]);

        if (isset($datos['lat'], $datos['lng'])) {
            $almacen->latitud = (float) $datos['lat'];
            $almacen->longitud = (float) $datos['lng'];
        }

        if (isset($datos['radio_geocerca_m'])) {
            $almacen->radio_geocerca_m = (int) $datos['radio_geocerca_m'];
        }

        $almacen->save();

        return response()->json([
            'success' => true,
            'message' => 'Geocerca actualizada.',
            'data' => $almacen->only(['id', 'nombre', 'radio_geocerca_m', 'latitud', 'longitud']),
        ]);
    }

    public function sugerencias(Request $request, GeocodificacionService $servicio): JsonResponse
    {
        $datos = $request->validate([
            'q' => 'required|string|min:2|max:120',
        ]);

        return response()->json([
            'success' => true,
            'data' => $servicio->sugerencias($datos['q']),
        ]);
    }

    public function reversa(Request $request, GeocodificacionService $servicio): JsonResponse
    {
        $datos = $request->validate([
            'lat' => 'required|numeric|between:-90,90',
            'lng' => 'required|numeric|between:-180,180',
        ]);

        $resultado = $servicio->reversa((float) $datos['lat'], (float) $datos['lng']);

        if ($resultado === null) {
            return response()->json([
                'success' => false,
                'message' => 'No se pudo obtener la dirección.',
            ], 422);
        }

        return response()->json(['success' => true, 'data' => $resultado]);
    }
}
