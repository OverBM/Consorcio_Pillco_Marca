<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Geo\Drivers\HaversineDriver;
use App\Domain\Geo\Dto\Coordenada;
use App\Http\Controllers\Controller;
use App\Models\Despacho;
use App\Models\DespachoPosicion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PosicionDespachoController extends Controller
{
    public function __construct(private readonly HaversineDriver $haversine) {}

    public function store(Request $request, Despacho $despacho): JsonResponse
    {
        if (! $this->estaEnRuta($despacho)) {
            return response()->json([
                'success' => false,
                'message' => 'El despacho no está en ruta o ya fue recepcionado.',
            ], 409);
        }

        $items = $request->has('posiciones')
            ? $request->input('posiciones')
            : [$request->all()];

        if (! is_array($items) || count($items) > 50) {
            throw ValidationException::withMessages([
                'posiciones' => 'El lote debe tener entre 1 y 50 posiciones.',
            ]);
        }

        $aceptadas = [];
        $rechazadas = [];

        foreach ($items as $indice => $item) {
            try {
                $validado = Validator::make(is_array($item) ? $item : [], [
                    'lat' => 'required|numeric|between:-90,90',
                    'lng' => 'required|numeric|between:-180,180',
                    'precision_m' => 'nullable|numeric|min:0|max:10000',
                    'velocidad_kmh' => 'nullable|numeric|min:0|max:200',
                    'rumbo' => 'nullable|numeric|between:0,360',
                    'capturada_en' => 'nullable|date',
                    'uuid' => 'nullable|uuid',
                ])->validate();

                $capturada = isset($validado['capturada_en'])
                    ? Carbon::parse($validado['capturada_en'])
                    : now();

                if ($capturada->lt(now()->subMinutes(5)) || $capturada->gt(now()->addMinute())) {
                    $rechazadas[] = [
                        'indice' => $indice,
                        'motivo' => 'La posición tiene más de 5 minutos de antigüedad o está en el futuro.',
                    ];

                    continue;
                }

                $uuid = (string) ($validado['uuid'] ?? Str::uuid());

                if (DespachoPosicion::query()->where('uuid', $uuid)->exists()) {
                    $aceptadas[] = ['uuid' => $uuid, 'duplicado' => true];

                    continue;
                }

                $posicion = DespachoPosicion::create([
                    'despacho_id' => $despacho->id,
                    'latitud' => $validado['lat'],
                    'longitud' => $validado['lng'],
                    'precision_m' => $validado['precision_m'] ?? null,
                    'velocidad_kmh' => $validado['velocidad_kmh'] ?? null,
                    'rumbo' => $validado['rumbo'] ?? null,
                    'origen' => $request->input('origen', 'pwa'),
                    'uuid' => $uuid,
                    'capturada_en' => $capturada,
                    'recibida_en' => now(),
                ]);

                $this->guardarGeografia($posicion);
                $aceptadas[] = ['uuid' => $uuid, 'duplicado' => false];
            } catch (ValidationException $error) {
                $rechazadas[] = ['indice' => $indice, 'motivo' => $error->getMessage()];
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Posiciones procesadas.',
            'data' => [
                'aceptadas' => $aceptadas,
                'rechazadas' => $rechazadas,
            ],
        ], 201);
    }

    public function index(Request $request, Despacho $despacho): JsonResponse
    {
        $desde = $request->filled('desde')
            ? Carbon::parse($request->input('desde'))
            : now()->subDay();

        $posiciones = DespachoPosicion::query()
            ->where('despacho_id', $despacho->id)
            ->where('capturada_en', '>=', $desde)
            ->orderBy('capturada_en')
            ->limit(5000)
            ->get();

        $ultima = $posiciones->last();

        return response()->json([
            'success' => true,
            'data' => [
                'posiciones' => $posiciones,
                'ultima_posicion' => $ultima,
                'antiguedad_seg' => $ultima !== null
                    ? (int) Carbon::parse($ultima->capturada_en)->diffInSeconds(now())
                    : null,
                'distancia_recorrida_m' => $this->distanciaRecorrida($posiciones),
            ],
        ]);
    }

    private function estaEnRuta(Despacho $despacho): bool
    {
        $despacho->loadMissing('transferencia.confirmacionRecepcion');

        return $despacho->transferencia !== null
            && $despacho->transferencia->estado === 'en_transito'
            && $despacho->transferencia->confirmacionRecepcion === null;
    }

    private function guardarGeografia(DespachoPosicion $posicion): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::update(
            'UPDATE despacho_posiciones SET ubicacion = ST_SetSRID(ST_MakePoint(?, ?), 4326) WHERE id = ?',
            [(float) $posicion->longitud, (float) $posicion->latitud, $posicion->id],
        );
    }

    /**
     * @param  Collection<int, DespachoPosicion>  $posiciones
     */
    private function distanciaRecorrida($posiciones): float
    {
        $total = 0.0;
        $anterior = null;

        foreach ($posiciones as $posicion) {
            $actual = new Coordenada((float) $posicion->latitud, (float) $posicion->longitud);

            if ($anterior !== null) {
                $total += $this->haversine->calcular($anterior, $actual)->distanciaM;
            }

            $anterior = $actual;
        }

        return round($total, 1);
    }
}
