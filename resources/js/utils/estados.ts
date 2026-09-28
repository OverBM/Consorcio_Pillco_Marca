// Deriva el estado de un stock (óptimo/bajo/crítico/sobrante/inactivo) para
// KPIs, tablas, badges y el color de los pines del mapa.

import type { Almacen, EstadoObra, Material } from '../types';
import type { StockState } from '../data/stock';

export type StockEstado = 'optimo' | 'bajo' | 'critico' | 'sobrante' | 'inactivo';

export interface EstadoMeta {
    label: string;
    /** Clases de dot (punto de 6px). */
    dot: string;
    /** Clases del chip. */
    chip: string;
    /** Color hex (usa el mapa SVG y estilos inline). */
    hex: string;
}

export const ESTADO_META: Record<StockEstado, EstadoMeta> = {
    optimo: {
        label: 'Óptimo',
        dot: 'bg-ok',
        chip: 'bg-ok-soft text-emerald-800',
        hex: '#10b981',
    },
    bajo: {
        label: 'Stock bajo',
        dot: 'bg-warn',
        chip: 'bg-warn-soft text-amber-800',
        hex: '#f59e0b',
    },
    critico: {
        label: 'Crítico',
        dot: 'bg-danger',
        chip: 'bg-danger-soft text-orange-800',
        hex: '#ea580c',
    },
    sobrante: {
        label: 'Sobrante por cierre',
        dot: 'bg-sobrante',
        chip: 'bg-sobrante-soft text-violet-800',
        hex: '#7c3aed',
    },
    inactivo: {
        label: 'Inactivo',
        dot: 'bg-ghost',
        chip: 'bg-ghost-soft text-slate-600',
        hex: '#64748b',
    },
};

export function estadoDeStock(cantidad: number, minimo: number, obraEstado: EstadoObra): StockEstado {
    if (obraEstado === 'cerrada' || obraEstado === 'en-cierre') {
        if (cantidad >= minimo * 2) {
            return 'sobrante';
        }
        return cantidad > 0 ? 'inactivo' : 'inactivo';
    }
    if (cantidad === 0) {
        return 'critico';
    }
    if (cantidad < minimo * 0.6) {
        return 'critico';
    }
    if (cantidad < minimo) {
        return 'bajo';
    }
    return 'optimo';
}

/** Estado agregado de un almacén (para el pin del mapa y el KPI de la Matriz). */
export function estadoDeAlmacen(
    alm: Almacen,
    obraEstado: EstadoObra,
    stock: StockState,
    materiales: Material[],
): StockEstado {
    const prioridad: Record<StockEstado, number> = {
        sobrante: 4,
        critico: 3,
        bajo: 2,
        inactivo: 1,
        optimo: 0,
    };
    let peor: StockEstado = 'optimo';
    for (const material of materiales) {
        const cantidad = stock.stock[alm.id]?.[material.id] ?? 0;
        const estado = estadoDeStock(cantidad, material.stockMinimo, obraEstado);
        if (prioridad[estado] > prioridad[peor]) {
            peor = estado;
        }
    }
    return peor;
}