<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Optimization\AhpOptimizationService;
use App\Http\Controllers\Controller;
use App\Models\ExcedenteDetectado;
use App\Models\Material;
use App\Models\Obra;
use App\Models\Transferencia;
use App\Models\TransferenciaDetalle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Gestión de excedentes detectados y acciones de redistribución.
 */
class ExcedenteController extends Controller
{
    public function __construct(
        protected AhpOptimizationService $ahpService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $excedentes = ExcedenteDetectado::query()
            ->with(['obra:id,nombre', 'almacen:id,nombre', 'material.unidadMedida'])
            ->when($request->filled('estado'), fn ($q) => $q->where('estado', $request->input('estado')))
            ->when($request->filled('obra_origen_id'), fn ($q) => $q->where('obra_origen_id', $request->input('obra_origen_id')))
            ->orderByDesc('detectado_en')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $excedentes,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validar($request);

        $excedente = ExcedenteDetectado::create([
            ...$validated,
            'detectado_en' => $validated['detectado_en'] ?? now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Excedente registrado exitosamente.',
            'data' => $excedente->load(['obra:id,nombre', 'almacen:id,nombre', 'material.unidadMedida']),
        ], 201);
    }

    public function update(Request $request, ExcedenteDetectado $excedente): JsonResponse
    {
        $excedente->update($this->validar($request, $excedente));

        return response()->json([
            'success' => true,
            'message' => 'Excedente actualizado exitosamente.',
            'data' => $excedente->fresh()->load(['obra:id,nombre', 'almacen:id,nombre', 'material.unidadMedida']),
        ]);
    }

    public function destroy(ExcedenteDetectado $excedente): JsonResponse
    {
        $excedente->delete();

        return response()->json([
            'success' => true,
            'message' => 'Excedente eliminado exitosamente.',
        ]);
    }

    /**
     * Sugiere receptores para el excedente usando el motor AHP.
     */
    public function sugerir(ExcedenteDetectado $excedente): JsonResponse
    {
        $material = Material::find($excedente->material_id);
        $obraOrigen = Obra::find($excedente->obra_origen_id);

        $sugerencias = [];
        if ($obraOrigen && $material) {
            $sugerencias = $this->ahpService->calcularRankingTransferencias(
                $obraOrigen->id,
                $material->id,
                (float) $excedente->cantidad
            );
        }

        return response()->json([
            'success' => true,
            'data' => [
                'excedente_id' => $excedente->id,
                'sugerencias' => $sugerencias,
            ],
        ]);
    }

    /**
     * Genera una transferencia sugerida reutilizando el flujo de transferencias.
     */
    public function generarTransferencia(Request $request, ExcedenteDetectado $excedente): JsonResponse
    {
        $validated = $request->validate([
            'almacen_destino_id' => ['required', 'integer', Rule::exists('almacenes', 'id')],
            'cantidad' => ['nullable', 'numeric', 'min:0.001'],
        ]);

        if ((int) $validated['almacen_destino_id'] === (int) $excedente->almacen_id) {
            return response()->json([
                'success' => false,
                'message' => 'El almacén destino debe ser distinto al almacén de origen.',
                'errors' => ['almacen_destino_id' => ['Seleccione un almacén destino diferente.']],
            ], 422);
        }

        $cantidad = (float) ($validated['cantidad'] ?? $excedente->cantidad);
        $usuarioId = $request->user()?->id ?? 1;

        $transferencia = DB::transaction(function () use ($excedente, $validated, $cantidad, $usuarioId) {
            $transferencia = Transferencia::create([
                'codigo' => 'TRF-'.date('Ymd').'-'.strtoupper(Str::random(4)),
                'almacen_origen_id' => $excedente->almacen_id,
                'almacen_destino_id' => $validated['almacen_destino_id'],
                'excedente_id' => $excedente->id,
                'motivo' => 'excedente_cierre',
                'estado' => 'sugerida',
                'generada_automaticamente' => false,
                'creada_por' => $usuarioId,
            ]);

            TransferenciaDetalle::create([
                'transferencia_id' => $transferencia->id,
                'material_id' => $excedente->material_id,
                'cantidad_solicitada' => $cantidad,
            ]);

            $excedente->update(['estado' => 'redistribuido']);

            return $transferencia;
        });

        return response()->json([
            'success' => true,
            'message' => 'Transferencia sugerida generada desde el excedente.',
            'data' => $transferencia->load('detalles'),
        ], 201);
    }

    /**
     * @return array<string, mixed>
     */
    private function validar(Request $request, ?ExcedenteDetectado $excedente = null): array
    {
        return $request->validate([
            'obra_origen_id' => ['required', 'integer', Rule::exists('obras', 'id')],
            'almacen_id' => ['required', 'integer', Rule::exists('almacenes', 'id')],
            'material_id' => ['required', 'integer', Rule::exists('materiales', 'id')],
            'cantidad' => ['required', 'numeric', 'min:0.001'],
            'origen' => ['required', 'string', Rule::in(['manual', 'cierre_obra', 'liquidacion', 'devolucion', 'inventario'])],
            'estado' => ['nullable', 'string', Rule::in(['detectado', 'sugerido', 'redistribuido', 'descartado'])],
            'detectado_en' => ['nullable', 'date'],
        ]);
    }
}
