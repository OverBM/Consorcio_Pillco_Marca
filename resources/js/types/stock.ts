import type { PartidaReserva } from './dominio';

/** Estado de inventario por almacén y material compartido entre mapa, detalle y utilidades. */
export interface StockState {
    /** stock[almacenId][materialId] = cantidad física disponible. */
    stock: Record<string, Record<string, number>>;
    /** Materiales reservados para una partida del plan de obra (Decisión 13). */
    reservas: Record<string, Record<string, PartidaReserva[]>>;
}
