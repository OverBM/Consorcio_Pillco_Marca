<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\LineaBaseCosto;
use App\Models\SolicitudCambio;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SolicitudCambioController extends Controller
{
    /**
     * Listar solicitudes de cambio contractual o técnico.
     */
    public function index(Request $request): JsonResponse
    {
        $query = SolicitudCambio::with(['obra', 'solicitante', 'decisor'])
            ->orderBy('id', 'desc');

        if ($request->filled('obra_id')) {
            $query->where('obra_id', $request->input('obra_id'));
        }

        if ($request->filled('estado')) {
            $query->where('estado', $request->input('estado'));
        }

        $solicitudes = $query->paginate($request->integer('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $solicitudes->items(),
            'meta' => [
                'current_page' => $solicitudes->currentPage(),
                'last_page' => $solicitudes->lastPage(),
                'total' => $solicitudes->total(),
            ],
        ]);
    }

    /**
     * Registrar nueva solicitud de cambio (adicional, deductivo, ampliación de plazo).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'obra_id' => 'required|exists:obras,id',
            'tipo' => 'required|string|in:alcance,plazo,costo',
            'descripcion' => 'required|string',
            'impacto_plazo_dias' => 'nullable|integer|min:0',
            'impacto_costo' => 'nullable|numeric',
        ]);

        $usuarioId = $request->user()?->id ?? 1;

        $solicitud = SolicitudCambio::create([
            'obra_id' => $validated['obra_id'],
            'tipo' => $validated['tipo'],
            'descripcion' => $validated['descripcion'],
            'impacto_plazo_dias' => $validated['impacto_plazo_dias'] ?? 0,
            'impacto_costo' => $validated['impacto_costo'] ?? 0,
            'estado' => 'solicitada',
            'solicitada_por' => $usuarioId,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Solicitud de cambio registrada.',
            'data' => $solicitud->load('obra'),
        ], 201);
    }

    /**
     * Evaluar y decidir sobre la solicitud de cambio (Comité de Control de Cambios).
     */
    public function evaluar(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'estado' => 'required|string|in:aprobada,rechazada',
        ]);

        $solicitud = SolicitudCambio::findOrFail($id);
        $usuarioId = $request->user()?->id ?? 1;

        DB::transaction(function () use ($solicitud, $validated, $usuarioId) {
            $solicitud->update([
                'estado' => $validated['estado'],
                'decidida_por' => $usuarioId,
                'decidida_en' => now(),
            ]);

            // Si se aprueba y tiene impacto de costo, actualizar línea base de costo vigente
            if ($validated['estado'] === 'aprobada' && (float) $solicitud->impacto_costo != 0) {
                $lineaBaseActual = LineaBaseCosto::where('obra_id', $solicitud->obra_id)
                    ->where('vigente', true)
                    ->first();

                if ($lineaBaseActual) {
                    $nuevaVersion = (int) $lineaBaseActual->version + 1;
                    $lineaBaseActual->update(['vigente' => false]);

                    LineaBaseCosto::create([
                        'obra_id' => $solicitud->obra_id,
                        'version' => $nuevaVersion,
                        'bac' => (float) $lineaBaseActual->bac + (float) $solicitud->impacto_costo,
                        'vigente' => true,
                        'aprobada_por' => $usuarioId,
                    ]);
                }
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Solicitud de cambio evaluada exitosamente.',
            'data' => $solicitud->fresh(),
        ]);
    }
}
