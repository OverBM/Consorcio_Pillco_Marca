import { describe, expect, it } from 'vitest';

import type { Almacen, Material } from '../../types';
import type { StockState } from '../../types/stock';
import { ESTADO_META, estadoDeAlmacen, estadoDeStock } from '../../utils/estados';

const material1: Material = {
    id: 'm1',
    nombre: 'Cemento',
    categoria: 'Cemento',
    unidad: 'bol',
    stockMinimo: 100,
};

const material2: Material = {
    id: 'm2',
    nombre: 'Acero',
    categoria: 'Acero',
    unidad: 'kg',
    stockMinimo: 50,
};

const almacen: Almacen = {
    id: 'a1',
    obraId: 'o1',
    nombre: 'Almacén Central',
    tipo: 'central',
    coords: { lat: -12.06, lng: -75.21 },
    capacidadM3: 500,
};

function stockCon(valores: Record<string, Record<string, number>>): StockState {
    return { stock: valores, reservas: {} };
}

describe('utils/estados', () => {
    it('expone la metadata visual de cada estado', () => {
        expect(ESTADO_META.optimo.label).toBe('Óptimo');
        expect(ESTADO_META.sobrante.hex).toBe('#7c3aed');
        expect(Object.keys(ESTADO_META)).toHaveLength(5);
    });

    it('deriva el estado de stock de una obra activa', () => {
        expect(estadoDeStock(0, 100, 'activa')).toBe('critico');
        expect(estadoDeStock(50, 100, 'activa')).toBe('critico');
        expect(estadoDeStock(80, 100, 'activa')).toBe('bajo');
        expect(estadoDeStock(100, 100, 'activa')).toBe('optimo');
    });

    it('deriva sobrante o inactivo cuando la obra se cierra', () => {
        expect(estadoDeStock(250, 100, 'cerrada')).toBe('sobrante');
        expect(estadoDeStock(250, 100, 'en-cierre')).toBe('sobrante');
        expect(estadoDeStock(120, 100, 'cerrada')).toBe('inactivo');
    });

    it('agrega el peor estado de un almacén', () => {
        const stock = stockCon({
            a1: { m1: 0, m2: 200 },
        });

        expect(estadoDeAlmacen(almacen, 'activa', stock, [material1, material2])).toBe(
            'critico',
        );

        const stockOptimo = stockCon({ a1: { m1: 100, m2: 50 } });
        expect(
            estadoDeAlmacen(almacen, 'activa', stockOptimo, [
                material1,
                material2,
            ]),
        ).toBe('optimo');
    });

    it('considera cantidad cero los almacenes sin stock registrado', () => {
        expect(
            estadoDeAlmacen(almacen, 'activa', stockCon({}), [material1]),
        ).toBe('critico');
        expect(estadoDeAlmacen(almacen, 'activa', stockCon({}), [])).toBe(
            'optimo',
        );
    });

    it('prioriza sobrante sobre el resto de estados', () => {
        const stock = stockCon({ a1: { m1: 0, m2: 500 } });

        expect(
            estadoDeAlmacen(almacen, 'cerrada', stock, [material1, material2]),
        ).toBe('sobrante');
    });
});
