<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Geo\Drivers\HaversineDriver;
use App\Domain\Geo\Dto\Coordenada;
use App\Http\Controllers\Controller;
use App\Models\AlertaGeoespacial;
use App\Models\Despacho;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReporteLogisticoController extends Controller
{
    public function __construct(private readonly HaversineDriver $haversine) {}

    public function index(Request $request): JsonResponse|StreamedResponse
    {
        $desde = $request->filled('desde')
            ? Carbon::parse($request->input('desde'))
            : now()->subDays(30);
        $hasta = $request->filled('hasta')
            ? Carbon::parse($request->input('hasta'))
            : now();

        $despachos = Despacho::query()
            ->with(['transferencia.almacenOrigen:id,nombre', 'transferencia.almacenDestino:id,nombre', 'transferencia.confirmacionRecepcion'])
            ->whereBetween('despachado_en', [$desde, $hasta])
            ->when($request->filled('almacen_id'), fn ($query) => $query->whereHas(
                'transferencia',
                fn ($subquery) => $subquery->where('almacen_origen_id', $request->integer('almacen_id'))
                    ->orWhere('almacen_destino_id', $request->integer('almacen_id')),
            ))
            ->orderBy('despachado_en')
            ->get();

        $filas = $despachos->map(function (Despacho $despacho): array {
            $transferencia = $despacho->transferencia;
            $posiciones = $despacho->posiciones()->orderBy('capturada_en')->get();
            $recorrido = 0.0;
            $anterior = null;

            foreach ($posiciones as $posicion) {
                $actual = new Coordenada((float) $posicion->latitud, (float) $posicion->longitud);

                if ($anterior !== null) {
                    $recorrido += $this->haversine->calcular($anterior, $actual)->distanciaM;
                }

                $anterior = $actual;
            }

            $alertas = AlertaGeoespacial::query()->where('despacho_id', $despacho->id)->count();
            $tiempoReal = $transferencia?->confirmacionRecepcion?->recibida_en !== null
                ? Carbon::parse($transferencia->confirmacionRecepcion->recibida_en)
                    ->diffInMinutes(Carbon::parse($despacho->despachado_en))
                : null;

            return [
                'despacho_id' => $despacho->id,
                'codigo' => $transferencia?->codigo,
                'origen' => $transferencia?->almacenOrigen?->nombre,
                'destino' => $transferencia?->almacenDestino?->nombre,
                'despachado_en' => $despacho->despachado_en,
                'km_planificados' => $transferencia?->distancia_m !== null
                    ? round((float) $transferencia->distancia_m / 1000, 2)
                    : null,
                'km_recorridos' => round($recorrido / 1000, 2),
                'tiempo_estimado_min' => $transferencia?->eta_min !== null ? (float) $transferencia->eta_min : null,
                'tiempo_real_min' => $tiempoReal,
                'desvios' => $alertas,
                'con_tracking' => $posiciones->isNotEmpty(),
            ];
        })->values();

        if ($request->input('formato') === 'csv') {
            return response()->streamDownload(function () use ($filas): void {
                $salida = fopen('php://output', 'w');
                fputcsv($salida, [
                    'despacho_id', 'codigo', 'origen', 'destino', 'despachado_en',
                    'km_planificados', 'km_recorridos', 'tiempo_estimado_min', 'tiempo_real_min',
                    'desvios', 'con_tracking',
                ]);

                foreach ($filas as $fila) {
                    fputcsv($salida, array_values($fila));
                }

                fclose($salida);
            }, 'reporte-logistico.csv', ['Content-Type' => 'text/csv']);
        }

        return response()->json([
            'success' => true,
            'data' => $filas,
            'meta' => [
                'desde' => $desde->toDateString(),
                'hasta' => $hasta->toDateString(),
                'total' => $filas->count(),
            ],
        ]);
    }
}
