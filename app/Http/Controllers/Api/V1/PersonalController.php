<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Geo\GeoService;
use App\Http\Controllers\Controller;
use App\Models\Asistencia;
use App\Models\Marcacion;
use App\Models\Obra;
use App\Models\Planilla;
use App\Models\PlanillaDetalle;
use App\Models\Trabajador;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PersonalController extends Controller
{
    public function __construct(
        protected GeoService $geoService
    ) {}

    /**
     * Listar trabajadores activos de la obra o consorcio.
     */
    public function indexTrabajadores(Request $request): JsonResponse
    {
        $query = Trabajador::with('obra')->orderBy('nombres');

        if ($request->filled('obra_id')) {
            $query->where('obra_id', $request->input('obra_id'));
        }

        $trabajadores = $query->paginate($request->integer('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $trabajadores->items(),
            'meta' => [
                'current_page' => $trabajadores->currentPage(),
                'last_page' => $trabajadores->lastPage(),
                'total' => $trabajadores->total(),
            ],
        ]);
    }

    /**
     * Registrar nuevo trabajador.
     */
    public function storeTrabajador(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'dni' => 'required|string|max:12|unique:trabajadores,dni',
            'nombres' => 'required|string|max:160',
            'cargo' => 'nullable|string|max:80',
            'obra_id' => 'nullable|exists:obras,id',
            'frente_id' => 'nullable|exists:frentes_trabajo,id',
        ]);

        $trabajador = Trabajador::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Trabajador registrado exitosamente.',
            'data' => $trabajador,
        ], 201);
    }

    /**
     * Registrar marcación de asistencia con validación de geocerca geodésica.
     */
    public function storeMarcacion(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'trabajador_id' => 'required|exists:trabajadores,id',
            'obra_id' => 'required|exists:obras,id',
            'tipo' => 'required|string|in:entrada,salida',
            'latitud' => 'required|numeric|between:-90,90',
            'longitud' => 'required|numeric|between:-180,180',
        ]);

        $obra = Obra::findOrFail($validated['obra_id']);

        $distanciaM = 0.0;
        $dentroGeocerca = true;

        if ($obra->latitud && $obra->longitud) {
            $distanciaM = $this->geoService->calcularDistanciaMetros(
                (float) $validated['latitud'],
                (float) $validated['longitud'],
                (float) $obra->latitud,
                (float) $obra->longitud
            );

            // Geocerca estándar de obra: radio de 500 metros
            $dentroGeocerca = $distanciaM <= 500.0;
        }

        $marcacion = Marcacion::create([
            'trabajador_id' => $validated['trabajador_id'],
            'obra_id' => $validated['obra_id'],
            'tipo' => $validated['tipo'],
            'marcado_en' => now(),
            'distancia_a_obra_m' => round($distanciaM, 1),
            'dentro_geocerca' => $dentroGeocerca,
            'ubicacion' => "{$validated['latitud']},{$validated['longitud']}",
            'created_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => $dentroGeocerca
                ? 'Marcación registrada dentro de la geocerca de obra.'
                : 'Marcación registrada FUERA de la geocerca de obra.',
            'data' => $marcacion->load(['trabajador', 'obra']),
        ], 201);
    }

    /**
     * Listar asistencias consolidadas.
     */
    public function indexAsistencias(Request $request): JsonResponse
    {
        $query = Asistencia::with(['trabajador', 'obra'])->orderBy('fecha', 'desc');

        if ($request->filled('obra_id')) {
            $query->where('obra_id', $request->input('obra_id'));
        }

        if ($request->filled('fecha')) {
            $query->where('fecha', $request->input('fecha'));
        }

        $asistencias = $query->paginate($request->integer('per_page', 25));

        return response()->json([
            'success' => true,
            'data' => $asistencias->items(),
            'meta' => [
                'current_page' => $asistencias->currentPage(),
                'last_page' => $asistencias->lastPage(),
                'total' => $asistencias->total(),
            ],
        ]);
    }

    /**
     * Generar planilla de jornales del periodo.
     */
    public function generarPlanilla(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'obra_id' => 'required|exists:obras,id',
            'periodo' => 'required|string|max:20',
        ]);

        $usuarioId = $request->user()?->id ?? 1;

        $planilla = DB::transaction(function () use ($validated, $usuarioId) {
            $planilla = Planilla::updateOrCreate(
                ['obra_id' => $validated['obra_id'], 'periodo' => $validated['periodo']],
                ['estado' => 'procesada', 'procesada_por' => $usuarioId, 'total' => 0]
            );

            // Eliminar detalles previos si se recalcula
            PlanillaDetalle::where('planilla_id', $planilla->id)->delete();

            $trabajadores = Trabajador::where('obra_id', $validated['obra_id'])->where('activo', true)->get();
            $totalMonto = 0.0;

            foreach ($trabajadores as $tr) {
                // Asumir cálculo base por jornal
                $dias = 24;
                $horas = 192.0;
                $monto = 2400.00; // Tarifa referencial

                PlanillaDetalle::create([
                    'planilla_id' => $planilla->id,
                    'trabajador_id' => $tr->id,
                    'dias_laborados' => $dias,
                    'horas_totales' => $horas,
                    'monto' => $monto,
                ]);

                $totalMonto += $monto;
            }

            $planilla->update(['total' => $totalMonto]);

            return $planilla;
        });

        return response()->json([
            'success' => true,
            'message' => 'Planilla generada y procesada correctamente.',
            'data' => $planilla->load('detalles.trabajador'),
        ], 201);
    }
}
