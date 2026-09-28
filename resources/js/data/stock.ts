import type { PartidaReserva } from '../types';

// Saldos de inventario simulados por almacén y material (fuente única de la
// Matriz de Stock). El caso central: IE Los Andes (cerrada) deja 2400 bolsas
// de Cemento Andino Tipo V sobrantes; Frente El Tambo está en déficit crítico
// del mismo material y Puente Cunas por debajo del mínimo (receptoras sugeridas).

export interface StockState {
    /** stock[almacenId][materialId] = cantidad física disponible. */
    stock: Record<string, Record<string, number>>;
    /** Materiales "reservados" = apartados para una partida del plan de obra (Decisión 13). */
    reservas: Record<string, Record<string, PartidaReserva[]>>;
}

export const stockInicial: StockState = {
    stock: {
        'alm-central': {
            'mat-cemento-1': 4200,
            'mat-cemento-2': 2600,
            'mat-acero': 12500,
            'mat-arena': 420,
            'mat-grava': 510,
            'mat-pvc': 1200,
            'mat-ladrillo': 18000,
        },
        'alm-eltambo': {
            'mat-cemento-1': 320, // crítico (< 600)
            'mat-cemento-2': 180, // bajo (< 500)
            'mat-acero': 6200,
            'mat-arena': 96, // bajo (< 120)
            'mat-grava': 190,
            'mat-pvc': 240, // bajo (< 300)
            'mat-ladrillo': 9000,
        },
        'alm-cunas': {
            'mat-cemento-1': 520, // bajo (< 600) → receptora candidata
            'mat-cemento-2': 760,
            'mat-acero': 3600, // bajo (< 4000) → receptora candidata (acero)
            'mat-arena': 150,
            'mat-grava': 200,
            'mat-pvc': 460,
            'mat-ladrillo': 11000,
        },
        'alm-chilca': {
            'mat-cemento-1': 900,
            'mat-cemento-2': 600,
            'mat-acero': 5000,
            'mat-arena': 84, // bajo (< 120)
            'mat-grava': 120, // bajo (< 150)
            'mat-pvc': 380,
            'mat-ladrillo': 7000, // bajo (< 8000)
        },
        'alm-ielosandes': {
            'mat-cemento-1': 2400, // SOBRANTE por cierre (caso central)
            'mat-cemento-2': 0,
            'mat-acero': 950, // sobrante menor
            'mat-arena': 18,
            'mat-grava': 0,
            'mat-pvc': 30,
            'mat-ladrillo': 0,
        },
    },
    reservas: {
        'alm-eltambo': {
            'mat-acero': [{ partida: 'P01 – Estructuras (pórticos)', cantidad: 500 }],
        },
        'alm-cunas': {
            'mat-acero': [{ partida: 'P03 – Superestructura', cantidad: 400 }],
        },
        'alm-central': {
            'mat-cemento-1': [{ partida: 'RL – Reserva logística central', cantidad: 600 }],
        },
    },
};