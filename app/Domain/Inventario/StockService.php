<?php

namespace App\Domain\Inventario;

use App\Models\StockAlmacen;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class StockService
{
    public function __construct(
        protected KardexService $kardexService
    ) {}

    /**
     * Ingreso por recepción de compra o ingreso inicial.
     */
    public function ingresarStock(
        int $almacenId,
        int $materialId,
        float $cantidad,
        string $tipoMovimiento = 'ingreso_recepcion',
        ?float $costoUnitario = null,
        ?string $documentoTipo = null,
        ?int $documentoId = null,
        ?int $usuarioId = null,
        ?int $loteId = null,
        ?string $observacion = null
    ): StockAlmacen {
        if ($cantidad <= 0) {
            throw new InvalidArgumentException('La cantidad a ingresar debe ser mayor a 0');
        }

        return DB::transaction(function () use (
            $almacenId, $materialId, $cantidad, $tipoMovimiento, $costoUnitario,
            $documentoTipo, $documentoId, $usuarioId, $loteId, $observacion
        ) {
            $stock = StockAlmacen::where('almacen_id', $almacenId)
                ->where('material_id', $materialId)
                ->lockForUpdate()
                ->first();

            if (! $stock) {
                $stock = StockAlmacen::create([
                    'almacen_id' => $almacenId,
                    'material_id' => $materialId,
                    'cantidad' => 0,
                    'cantidad_reservada' => 0,
                ]);
            }

            $nuevoSaldo = (float) $stock->cantidad + $cantidad;
            $stock->cantidad = $nuevoSaldo;
            $stock->save();

            $this->kardexService->registrarMovimiento(
                almacenId: $almacenId,
                materialId: $materialId,
                tipoMovimiento: $tipoMovimiento,
                cantidad: $cantidad,
                saldoResultante: $nuevoSaldo,
                costoUnitario: $costoUnitario,
                documentoTipo: $documentoTipo,
                documentoId: $documentoId,
                usuarioId: $usuarioId,
                loteId: $loteId,
                observacion: $observacion
            );

            return $stock;
        });
    }

    /**
     * Salida de stock por consumo, merma o despacho de transferencia.
     */
    public function egresarStock(
        int $almacenId,
        int $materialId,
        float $cantidad,
        string $tipoMovimiento = 'salida_consumo',
        ?float $costoUnitario = null,
        ?string $documentoTipo = null,
        ?int $documentoId = null,
        ?int $usuarioId = null,
        ?int $loteId = null,
        ?string $observacion = null,
        bool $liberarReservaPrevia = false
    ): StockAlmacen {
        if ($cantidad <= 0) {
            throw new InvalidArgumentException('La cantidad a egresar debe ser mayor a 0');
        }

        return DB::transaction(function () use (
            $almacenId, $materialId, $cantidad, $tipoMovimiento, $costoUnitario,
            $documentoTipo, $documentoId, $usuarioId, $loteId, $observacion, $liberarReservaPrevia
        ) {
            $stock = StockAlmacen::where('almacen_id', $almacenId)
                ->where('material_id', $materialId)
                ->lockForUpdate()
                ->first();

            if (! $stock) {
                throw new InvalidArgumentException("No existe stock registrado para el material ID {$materialId} en el almacén ID {$almacenId}");
            }

            if ((float) $stock->cantidad < $cantidad) {
                throw new InvalidArgumentException("Stock insuficiente para material ID {$materialId} en almacén ID {$almacenId}");
            }

            if ($liberarReservaPrevia) {
                $stock->cantidad_reservada = max(0, (float) $stock->cantidad_reservada - $cantidad);
            }

            $nuevoSaldo = (float) $stock->cantidad - $cantidad;
            $stock->cantidad = $nuevoSaldo;
            $stock->save();

            $this->kardexService->registrarMovimiento(
                almacenId: $almacenId,
                materialId: $materialId,
                tipoMovimiento: $tipoMovimiento,
                cantidad: -$cantidad,
                saldoResultante: $nuevoSaldo,
                costoUnitario: $costoUnitario,
                documentoTipo: $documentoTipo,
                documentoId: $documentoId,
                usuarioId: $usuarioId,
                loteId: $loteId,
                observacion: $observacion
            );

            return $stock;
        });
    }

    /**
     * Reserva de stock para una transferencia aprobada.
     */
    public function reservarStock(int $almacenId, int $materialId, float $cantidad): StockAlmacen
    {
        return DB::transaction(function () use ($almacenId, $materialId, $cantidad) {
            $stock = StockAlmacen::where('almacen_id', $almacenId)
                ->where('material_id', $materialId)
                ->lockForUpdate()
                ->first();

            if (! $stock) {
                throw new InvalidArgumentException("No existe stock registrado para el material ID {$materialId} en el almacén ID {$almacenId}");
            }

            $disponible = (float) $stock->cantidad - (float) $stock->cantidad_reservada;
            if ($disponible < $cantidad) {
                throw new InvalidArgumentException("Stock disponible insuficiente para reserva (disponible: {$disponible}, solicitado: {$cantidad})");
            }

            $stock->cantidad_reservada = (float) $stock->cantidad_reservada + $cantidad;
            $stock->save();

            return $stock;
        });
    }
}
