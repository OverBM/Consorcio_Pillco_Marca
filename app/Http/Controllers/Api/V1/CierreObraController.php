<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Almacen;
use App\Models\CierreObra;
use App\Models\ExcedenteDetectado;
use App\Models\Obra;
use App\Models\StockAlmacen;
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
        $cierre = CierreObra::where('obra_id', $obra->id)->first();
        $excedentes = ExcedenteDetectado::with('material')->where('obra_origen_id', $obra->id)->get();

        return response()->json([
            'success' => true,
            'data' => [
                'obra' => $obra,
                'cierre' => $cierre,
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

        $cierre = DB::transaction(function () use ($obra) {
            $cierre = CierreObra::updateOrCreate(
                ['obra_id' => $obra->id],
                [
                    'fecha_ejecucion_100' => now(),
                    'estado' => 'en_cierre',
                    'excedentes_evaluados' => true,
                ]
            );

            // Obtener todos los almacenes de la obra
            $almacenes = Almacen::where('obra_id', $obra->id)->pluck('id');

            // Detectar saldos positivos en inventario y registrarlos como excedentes disponibles
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

            return $cierre;
        });

        return response()->json([
            'success' => true,
            'message' => 'Proceso de cierre iniciado y excedentes de materiales cargados para redistribución.',
            'data' => $cierre->load('obra'),
        ]);
    }

    /**
     * Finalizar cierre y liquidación de obra.
     */
    public function finalizar(Request $request, int $obraId): JsonResponse
    {
        $obra = Obra::findOrFail($obraId);

        DB::transaction(function () use ($obra) {
            CierreObra::updateOrCreate(
                ['obra_id' => $obra->id],
                [
                    'fecha_recepcion_obra' => now(),
                    'estado' => 'cerrado',
                ]
            );

            $obra->update(['estado' => 'liquidada']);
        });

        return response()->json([
            'success' => true,
            'message' => 'Obra liquidada y cerrada definitivamente.',
        ]);
    }
}
