<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Almacen;
use App\Models\ExcedenteDetectado;
use App\Models\Obra;
use App\Models\StockAlmacen;
use App\Support\NotificadorOperativo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CierreObraController extends Controller
{
    /**
     * Ver estado de cierre y liquidación de obra.
     */
    public function show(int $obraId): JsonResponse
    {
        $obra = Obra::findOrFail($obraId);
        $excedentes = ExcedenteDetectado::with('material')->where('obra_origen_id', $obra->id)->get();

        return response()->json([
            'success' => true,
            'data' => [
                'obra' => $obra,
                'cierre' => [
                    'obra_id' => $obra->id,
                    'estado' => $obra->estado,
                    'informe_final_id' => $obra->informe_final_id,
                    'acta_recepcion_id' => $obra->acta_recepcion_id,
                    'cerrado_por' => $obra->cerrado_por,
                    'cerrado_en' => $obra->cerrado_en,
                    'observaciones_cierre' => $obra->observaciones_cierre,
                ],
                'excedentes' => $excedentes,
            ],
        ]);
    }

    /**
     * Iniciar proceso de cierre de obra y detección automática de excedentes de materiales.
     */
    public function iniciarCierre(Request $request, int $obraId): JsonResponse
    {
        $obra = Obra::findOrFail($obraId);

        DB::transaction(function () use ($obra) {
            $almacenes = Almacen::where('obra_id', $obra->id)->pluck('id');

            $stocks = StockAlmacen::whereIn('almacen_id', $almacenes)
                ->where('cantidad', '>', 0)
                ->get();

            foreach ($stocks as $st) {
                ExcedenteDetectado::updateOrCreate(
                    [
                        'obra_origen_id' => $obra->id,
                        'almacen_id' => $st->almacen_id,
                        'material_id' => $st->material_id,
                    ],
                    [
                        'cantidad' => $st->cantidad,
                        'origen' => 'cierre_obra',
                        'estado' => 'detectado',
                    ]
                );
            }

            $obra->update(['estado' => 'cierre']);
        });

        $excedentes = ExcedenteDetectado::query()
            ->where('obra_origen_id', $obra->id)
            ->where('estado', 'detectado')
            ->count();

        if ($excedentes > 0) {
            NotificadorOperativo::aRoles(
                ['jefe_logistica_compras', 'planificacion_administracion'],
                'excedente_detectado',
                'Excedentes disponibles para redistribución',
                "La obra {$obra->codigo} registró {$excedentes} excedente(s) tras iniciar el cierre.",
                'obra',
                $obra->id,
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Proceso de cierre iniciado y excedentes de materiales cargados para redistribución.',
            'data' => [
                'obra_id' => $obra->id,
                'estado' => 'en_cierre',
                'obra' => $obra->fresh(),
            ],
        ]);
    }

    /**
     * Finalizar cierre y liquidación de obra.
     */
    public function finalizar(Request $request, int $obraId): JsonResponse
    {
        $obra = Obra::findOrFail($obraId);

        if ($obra->estado !== 'cierre') {
            return response()->json([
                'success' => false,
                'message' => 'Primero inicia el proceso de cierre de la obra antes de liquidarla.',
            ], 422);
        }

        $obra->update([
            'estado' => 'liquidada',
            'cerrado_por' => $request->user()?->id ?? 1,
            'cerrado_en' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Obra liquidada y cerrada definitivamente.',
            'data' => $obra->fresh(),
        ]);
    }
}
