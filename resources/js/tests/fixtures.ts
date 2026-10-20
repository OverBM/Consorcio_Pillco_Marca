import type { Auth, Catalogos, Contexto, NotificacionesFeed } from '../types';

export const catalogosFixture: Catalogos = {
    obras: [
        {
            id: 1,
            codigo: 'OB-01',
            nombre: 'Mejoramiento Vía Huancayo',
            distrito: 'Huancayo',
            estado: 'activa',
            avance_fisico_pct: 42,
        },
    ],
    almacenes: [
        { id: 1, codigo: 'ALM-01', nombre: 'Almacén Central', obra_id: 1 },
        { id: 2, codigo: 'ALM-02', nombre: 'Almacén Frente 2', obra_id: 1 },
    ],
    materiales: [
        {
            id: 1,
            codigo: 'MAT-01',
            nombre: 'Cemento Portland',
            unidad: { id: 1, codigo: 'bol', nombre: 'Bolsa' },
        },
        {
            id: 2,
            codigo: 'MAT-02',
            nombre: 'Acero corrugado 1/2"',
            unidad: { id: 2, codigo: 'kg', nombre: 'Kilogramo' },
        },
    ],
};

export const authFixture: Auth = {
    user: {
        id: 1,
        name: 'Ana Torres',
        email: 'ana.torres@consorcio.test',
        dni: '70123456',
        roles: [{ codigo: 'area_financiera', nombre: 'Área Financiera' }],
        permisos: ['panel.ver', 'pmi.ver', 'logistica.ver'],
        obras: [{ id: 1, codigo: 'OB-01', nombre: 'Mejoramiento Vía Huancayo' }],
        almacenes: [{ id: 1, codigo: 'ALM-01', nombre: 'Almacén Central' }],
    },
};

export const notificacionesFixture: NotificacionesFeed = {
    items: [
        {
            id: 'notificacion-7',
            origen: 'notificacion',
            tipo: 'stock_bajo',
            titulo: 'Stock bajo de cemento',
            cuerpo: 'El almacén central está por debajo del mínimo.',
            severidad: 'alta',
            referencia_tipo: 'material',
            referencia_id: 1,
            leida: false,
            fecha: '2026-01-15T10:00:00.000Z',
        },
        {
            id: 'alerta-3',
            origen: 'alerta',
            tipo: 'critico',
            titulo: 'Alerta de stock crítico',
            cuerpo: null,
            severidad: null,
            referencia_tipo: null,
            referencia_id: null,
            leida: true,
            fecha: null,
        },
    ],
    sin_leer: 1,
};

export const contextoFixture: Contexto = {
    obra_activa_id: 1,
    almacen_activo_id: 1,
};

export function propsBase(): Record<string, unknown> {
    return {
        auth: authFixture,
        catalogos: catalogosFixture,
        contexto: contextoFixture,
        notificacionesFeed: notificacionesFixture,
    };
}
