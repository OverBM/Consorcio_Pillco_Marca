<?php

namespace App\Domain\Inventario;

use App\Models\Kardex;

class KardexService
{
    public function registrarMovimiento(
        int $almacenId,
        int $materialId,
        string $tipoMovimiento,
        float $cantidad,
        float $saldoResultante,
        ?float $costoUnitario = null,
        ?string $documentoTipo = null,
        ?int $documentoId = null,
        ?int $usuarioId = null,
        ?int $loteId = null,
        ?string $observacion = null
    ): Kardex {
        return Kardex::create([
            'almacen_id' => $almacenId,
            'material_id' => $materialId,
            'lote_id' => $loteId,
            'tipo_movimiento' => $tipoMovimiento,
            'cantidad' => $cantidad,
            'saldo_resultante' => $saldoResultante,
            'costo_unitario' => $costoUnitario,
            'documento_tipo' => $documentoTipo,
            'documento_id' => $documentoId,
            'usuario_id' => $usuarioId,
            'observacion' => $observacion,
            'created_at' => now(),
        ]);
    }
}
