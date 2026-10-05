<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ObservacionEvidencia;
use App\Models\ObservacionTecnica;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CalidadController extends Controller
{
    /**
     * Listar observaciones técnicas y no conformidades de calidad.
     */
    public function indexObservaciones(Request $request): JsonResponse
    {
        $query = ObservacionTecnica::with(['obra', 'responsable', 'evidencias'])
            ->orderBy('id', 'desc');

        if ($request->filled('obra_id')) {
            $query->where('obra_id', $request->input('obra_id'));
        }

        if ($request->filled('estado')) {
            $query->where('estado', $request->input('estado'));
        }

        $observaciones = $query->paginate($request->integer('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $observaciones->items(),
            'meta' => [
                'current_page' => $observaciones->currentPage(),
                'last_page' => $observaciones->lastPage(),
                'total' => $observaciones->total(),
            ],
        ]);
    }

    /**
     * Registrar observación técnica emitida por supervisión.
     */
    public function storeObservacion(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'obra_id' => 'required|exists:obras,id',
            'numero_acta' => 'nullable|string|max:40',
            'descripcion' => 'required|string',
            'origen' => 'nullable|string|max:12',
            'plazo_subsanacion' => 'nullable|date',
            'responsable_id' => 'nullable|exists:usuarios,id',
            'evidencia_ruta' => 'nullable|string',
        ]);

        $observacion = DB::transaction(function () use ($validated) {
            $obs = ObservacionTecnica::create([
                'obra_id' => $validated['obra_id'],
                'numero_acta' => $validated['numero_acta'] ?? null,
                'descripcion' => $validated['descripcion'],
                'origen' => $validated['origen'] ?? 'supervision',
                'plazo_subsanacion' => $validated['plazo_subsanacion'] ?? null,
                'responsable_id' => $validated['responsable_id'] ?? null,
                'estado' => 'notificada',
            ]);

            if (! empty($validated['evidencia_ruta'])) {
                ObservacionEvidencia::create([
                    'observacion_id' => $obs->id,
                    'etapa' => 'notificacion',
                    'ruta' => $validated['evidencia_ruta'],
                    'created_at' => now(),
                ]);
            }

            return $obs;
        });

        return response()->json([
            'success' => true,
            'message' => 'Observación técnica de calidad registrada.',
            'data' => $observacion->load(['obra', 'evidencias']),
        ], 201);
    }

    /**
     * Levantar y subsanar observación técnica de calidad.
     */
    public function levantarObservacion(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'evidencia_subsanacion_ruta' => 'nullable|string',
            'planos_asbuilt_actualizados' => 'nullable|boolean',
        ]);

        $observacion = ObservacionTecnica::findOrFail($id);

        DB::transaction(function () use ($observacion, $validated) {
            $observacion->update([
                'estado' => 'levantada',
                'planos_asbuilt_actualizados' => $validated['planos_asbuilt_actualizados'] ?? false,
            ]);

            if (! empty($validated['evidencia_subsanacion_ruta'])) {
                ObservacionEvidencia::create([
                    'observacion_id' => $observacion->id,
                    'etapa' => 'subsanacion',
                    'ruta' => $validated['evidencia_subsanacion_ruta'],
                    'created_at' => now(),
                ]);
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Observación técnica levantada y subsanada.',
            'data' => $observacion->fresh()->load('evidencias'),
        ]);
    }
}
