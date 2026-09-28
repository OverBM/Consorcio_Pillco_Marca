import type { Despacho } from '../types';

// Despachos iniciales (estados pendiente / en tránsito / entregado).
// El despacho prellenado desde la alerta de sobrante se crea en tiempo de
// ejecución (flujo 11.2), no viene precargado.

export const despachosIniciales: Despacho[] = [
    {
        id: 'desp-033',
        codigo: 'D-2024-033',
        materialId: 'mat-cemento-1',
        cantidad: 400,
        origenAlmacenId: 'alm-central',
        destinoAlmacenId: 'alm-eltambo',
        estado: 'en-transito',
        vehiculoId: 'veh-1',
        responsable: 'César Huamán',
        fechaSolicitud: '2026-09-06 15:00',
        pctRuta: 0.38,
    },
    {
        id: 'desp-034',
        codigo: 'D-2024-034',
        materialId: 'mat-arena',
        cantidad: 24,
        origenAlmacenId: 'alm-central',
        destinoAlmacenId: 'alm-chilca',
        estado: 'pendiente',
        vehiculoId: 'veh-2',
        responsable: 'César Huamán',
        fechaSolicitud: '2026-09-07 09:45',
    },
    {
        id: 'desp-030',
        codigo: 'D-2024-030',
        materialId: 'mat-acero',
        cantidad: 3000,
        origenAlmacenId: 'alm-central',
        destinoAlmacenId: 'alm-cunas',
        estado: 'entregado',
        vehiculoId: 'veh-3',
        responsable: 'César Huamán',
        fechaSolicitud: '2026-09-05 08:30',
        fechaEntrega: '2026-09-06 11:05',
        pctRuta: 1,
    },
];