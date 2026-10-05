<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Requerimiento;
use App\Models\RequerimientoDetalle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RequerimientoController extends Controller
{
    /**
     * Listar requerimientos de compra con filtros por obra y estado.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Requerimiento::with(['obra', 'almacen', 'solicitante', 'partida', 'detalles.material'])
            ->orderBy('id', 'desc');

        if ($request->filled('obra_id')) {
            $query->where('obra_id', $request->input('obra_id'));
        }

        if ($request->filled('estado')) {
            $query->where('estado', $request->input('estado'));
        }

        $requerimientos = $query->paginate($request->integer('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $requerimientos->items(),
            'meta' => [
                'current_page' => $requerimientos->currentPage(),
                'last_page' => $requerimientos->lastPage(),
                'total' => $requerimientos->total(),
            ],
        ]);
    }

    /**
     * Crear requerimiento de compra vinculado a una partida presupuestal.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'obra_id' => 'required|exists:obras,id',
            'almacen_id' => 'required|exists:almacenes,id',
            'partida_id' => 'nullable|exists:partidas,id',
            'prioridad' => 'nullable|in:urgente,alta,normal,baja',
            'justificacion' => 'required|string',
            'fecha_requerida' => 'nullable|date',
            'detalles' => 'required|array|min:1',
            'detalles.*.material_id' => 'required|exists:materiales,id',
            'detalles.*.cantidad' => 'required|numeric|min:0.001',
        ]);

        $usuarioId = $request->user()?->id ?? 1;

        $requerimiento = DB::transaction(function () use ($validated, $usuarioId) {
            $codigo = 'REQ-'.date('Ymd').'-'.strtoupper(Str::random(4));

            $requerimiento = Requerimiento::create([
                'codigo' => $codigo,
                'obra_id' => $validated['obra_id'],
                'almacen_id' => $validated['almacen_id'],
                'partida_id' => $validated['partida_id'] ?? null,
                'solicitante_id' => $usuarioId,
                'prioridad' => $validated['prioridad'] ?? 'normal',
                'estado' => 'solicitado',
                'justificacion' => $validated['justificacion'],
                'fecha_requerida' => $validated['fecha_requerida'] ?? null,
            ]);

            foreach ($validated['detalles'] as $item) {
                RequerimientoDetalle::create([
                    'requerimiento_id' => $requerimiento->id,
                    'material_id' => $item['material_id'],
                    'cantidad' => $item['cantidad'],
                    'cantidad_atendida' => 0,
                ]);
            }

            return $requerimiento;
        });

        return response()->json([
            'success' => true,
            'message' => 'Requerimiento registrado exitosamente.',
            'data' => $requerimiento->load(['detalles.material', 'obra', 'almacen']),
        ], 201);
    }

    /**
     * Aprobar o rechazar requerimiento de compra por Jefatura de Logística.
     */
    public function evaluar(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'estado' => 'required|in:aprobado,rechazado',
            'motivo_rechazo' => 'nullable|string|required_if:estado,rechazado',
        ]);

        $requerimiento = Requerimiento::findOrFail($id);
        $usuarioId = $request->user()?->id ?? 1;

        $requerimiento->update([
            'estado' => $validated['estado'],
            'aprobado_por' => $usuarioId,
            'aprobado_en' => now(),
            'motivo_rechazo' => $validated['motivo_rechazo'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Requerimiento {$validated['estado']} exitosamente.",
            'data' => $requerimiento->fresh(),
        ]);
    }
}
