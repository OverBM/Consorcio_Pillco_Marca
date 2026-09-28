// Alertas DERIVADAS del mock data (stock, obras, materiales): se recalculan
// desde el estado actual para que nunca queden obsoletas al confirmar
// recepciones/entregas. {acked} es un conjunto de ids acusados por el usuario.

import type { Alerta, Almacen, Material, Obra } from '../types';
import type { StockState } from './stock';
import { suggestReceivingObras } from '../utils/geo';

/** Umbral a partir del cual el saldo de un almacén en cierre cuenta como sobrante. */
const SOBRANTE_FACTOR = 2;

export interface BuildAlertasInput {
    obras: Obra[];
    almacenes: Almacen[];
    materiales: Material[];
    stock: StockState;
    acked: Set<string>;
}

export function buildAlertas({
    obras,
    almacenes,
    materiales,
    stock,
    acked,
}: BuildAlertasInput): Alerta[] {
    const obrasPorId = Object.fromEntries(obras.map((o) => [o.id, o]));
    const alertas: Alerta[] = [];
    let seq = 1;

    const push = (alerta: Omit<Alerta, 'id'>) => {
        alertas.push({ id: `alr-${String(seq++).padStart(2, '0')}`, ...alerta });
    };

    for (const alm of almacenes) {
        const obra = obrasPorId[alm.obraId];
        const enCierre = obra.estado === 'cerrada' || obra.estado === 'en-cierre';

        for (const material of materiales) {
            const cantidad = stock.stock[alm.id]?.[material.id] ?? 0;

            if (enCierre && cantidad >= material.stockMinimo * SOBRANTE_FACTOR) {
                // Sobrante por cierre + receptoras candidatas más cercanas.
                const receptoras = suggestReceivingObras({
                    materialId: material.id,
                    origen: alm,
                    almacenes,
                    obras: obrasPorId,
                    stock: stock.stock,
                    materiales,
                });
                push({
                    tipo: 'sobrante',
                    materialId: material.id,
                    almacenId: alm.id,
                    obraId: alm.obraId,
                    mensaje: `${material.nombre}: ${cantidad} ${material.unidad} disponibles por cierre de ${obra.nombre}.`,
                    cantidad,
                    receptoras,
                    createdAt: '2026-09-07 08:00',
                    resuelta: false,
                });
                continue;
            }

            if (enCierre) {
                continue;
            }

            if (cantidad < material.stockMinimo) {
                push({
                    tipo: 'critico',
                    materialId: material.id,
                    almacenId: alm.id,
                    obraId: alm.obraId,
                    mensaje: `${material.nombre} por debajo del stock mínimo en ${alm.nombre} (${cantidad} de ${material.stockMinimo} ${material.unidad}).`,
                    cantidad,
                    createdAt: '2026-09-07 08:00',
                    resuelta: false,
                });
            }
        }
    }

    // Vencimiento y discrepancia (mocks informativos).
    push({
        tipo: 'vencimiento',
        materialId: 'mat-cemento-1',
        almacenId: 'alm-central',
        obraId: 'obra-central',
        mensaje: 'Cemento Andino Tipo V: 400 bolsas del lote 2026-08 próximas a vencer en Almacén Central.',
        createdAt: '2026-09-06 10:00',
        resuelta: false,
    });
    push({
        tipo: 'discrepancia',
        materialId: 'mat-acero',
        almacenId: 'alm-cunas',
        obraId: 'obra-puentecunas',
        mensaje: 'Discrepancia física vs registrada detectada en Acero 5/8" de Puente Cunas (-80 kg).',
        createdAt: '2026-09-05 17:30',
        resuelta: false,
    });

    return alertas
        .filter((a) => !acked.has(a.id))
        .map((a) => ({ ...a, resuelta: false }));
}