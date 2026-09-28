import type { Movimiento } from '../types';

// Movimientos de los últimos 7 días (ingresos vs salidas agregados por día,
// para el gráfico del Panel General) + bitácora de movimientos recientes.

export const barChart7d: { fecha: string; etiqueta: string; ingreso: number; salida: number }[] = [
    { fecha: '2026-09-01', etiqueta: 'Lun', ingreso: 320, salida: 210 },
    { fecha: '2026-09-02', etiqueta: 'Mar', ingreso: 150, salida: 260 },
    { fecha: '2026-09-03', etiqueta: 'Mié', ingreso: 410, salida: 180 },
    { fecha: '2026-09-04', etiqueta: 'Jue', ingreso: 230, salida: 240 },
    { fecha: '2026-09-05', etiqueta: 'Vie', ingreso: 180, salida: 120 },
    { fecha: '2026-09-06', etiqueta: 'Sáb', ingreso: 90, salida: 130 },
    { fecha: '2026-09-07', etiqueta: 'Dom', ingreso: 145, salida: 85 },
];

export const movimientosRecientes: Movimiento[] = [
    { id: 'mov-01', fecha: '2026-09-07 09:15', almacenId: 'alm-central', materialId: 'mat-cemento-1', tipo: 'ingreso', cantidad: 600, referencia: 'OC-8821 / GR-004782', usuario: 'Joel Rojas' },
    { id: 'mov-02', fecha: '2026-09-07 08:40', almacenId: 'alm-eltambo', materialId: 'mat-acero', tipo: 'salida', cantidad: 240, referencia: 'VAL-0145', usuario: 'María Llanos' },
    { id: 'mov-03', fecha: '2026-09-06 16:20', almacenId: 'alm-chilca', materialId: 'mat-arena', tipo: 'ingreso', cantidad: 20, referencia: 'D-2024-032 (Cantera Mantaro)', usuario: 'César Huamán' },
    { id: 'mov-04', fecha: '2026-09-06 11:05', almacenId: 'alm-cunas', materialId: 'mat-acero', tipo: 'ingreso', cantidad: 3000, referencia: 'D-2024-030 / GR-004761', usuario: 'Ing. Sara Velarde' },
    { id: 'mov-05', fecha: '2026-09-05 15:30', almacenId: 'alm-central', materialId: 'mat-pvc', tipo: 'salida', cantidad: 120, referencia: 'VAL-0140', usuario: 'Joel Rojas' },
    { id: 'mov-06', fecha: '2026-09-05 10:10', almacenId: 'alm-eltambo', materialId: 'mat-grava', tipo: 'ingreso', cantidad: 30, referencia: 'GR-004755', usuario: 'María Llanos' },
    { id: 'mov-07', fecha: '2026-09-04 14:45', almacenId: 'alm-central', materialId: 'mat-acero', tipo: 'salida', cantidad: 3000, referencia: 'D-2024-030', usuario: 'Joel Rojas' },
    { id: 'mov-08', fecha: '2026-09-03 09:00', almacenId: 'alm-chilca', materialId: 'mat-grava', tipo: 'ingreso', cantidad: 40, referencia: 'GR-004732', usuario: 'Ing. Diego Salazar' },
];