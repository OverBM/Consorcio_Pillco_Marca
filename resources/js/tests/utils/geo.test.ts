import { describe, expect, it } from 'vitest';

import type { Almacen, Material, Obra } from '../../types';
import {
    MAP_BOUNDS,
    MAP_H,
    MAP_W,
    calculateCoordsCenter,
    formatCoordenadas,
    haversineDistanceKm,
    projectToMap,
    rankWarehousesForRequest,
    suggestReceivingObras,
} from '../../utils/geo';

const obra = (id: string, estado: Obra['estado'], distrito = 'Huancayo'): Obra => ({
    id,
    nombre: `Obra ${id}`,
    estado,
    distrito,
    responsable: 'Residente',
    descripcion: 'demo',
    coords: { lat: -12.06, lng: -75.21 },
    fechaInicio: '2026-01-01',
    pctAvance: 20,
});

const almacen = (id: string, obraId: string, coords: Almacen['coords']): Almacen => ({
    id,
    obraId,
    nombre: `Almacén ${id}`,
    tipo: 'frente',
    coords,
    capacidadM3: 100,
});

const cemento: Material = {
    id: 'm1',
    nombre: 'Cemento',
    categoria: 'Cemento',
    unidad: 'bol',
    stockMinimo: 100,
};

const a1 = almacen('a1', 'o1', { lat: -12.068, lng: -75.21 });
const a2 = almacen('a2', 'o2', { lat: -12.05, lng: -75.15 });
const a3 = almacen('a3', 'o3', { lat: -12.02, lng: -75.3 });

const obras: Record<string, Obra> = {
    o1: obra('o1', 'cerrada'),
    o2: obra('o2', 'activa', 'El Tambo'),
    o3: obra('o3', 'activa', 'Chupaca'),
};

describe('utils/geo', () => {
    it('proyecta coordenadas dentro del viewBox y recorta los extremos', () => {
        const centro = projectToMap(-12.06, -75.23);

        expect(centro.x).toBeGreaterThan(0);
        expect(centro.x).toBeLessThan(MAP_W);
        expect(centro.y).toBeGreaterThan(0);
        expect(centro.y).toBeLessThan(MAP_H);

        const fuera = projectToMap(10, 10);
        expect(fuera.x).toBeLessThanOrEqual(MAP_W);
        expect(fuera.y).toBeGreaterThanOrEqual(0);

        expect(MAP_BOUNDS.latMin).toBeLessThan(MAP_BOUNDS.latMax);
    });

    it('formatea coordenadas con hemisferio', () => {
        expect(formatCoordenadas(-12.068, -75.234)).toBe(
            '12.0680° S · 75.2340° O',
        );
        expect(formatCoordenadas(12.068, 75.234)).toBe(
            '12.0680° N · 75.2340° E',
        );
    });

    it('calcula distancias haversine', () => {
        expect(haversineDistanceKm(a1.coords, a1.coords)).toBe(0);
        expect(haversineDistanceKm(a1.coords, a2.coords)).toBeGreaterThan(0);
    });

    it('sugiere obras receptoras activas con déficit ordenadas por cercanía', () => {
        const sugeridas = suggestReceivingObras({
            materialId: 'm1',
            origen: a1,
            almacenes: [a1, a2, a3],
            obras,
            stock: { a2: { m1: 10 }, a3: { m1: 0 } },
            materiales: [cemento],
        });

        expect(sugeridas.map((s) => s.almacenId)).toEqual(['a2', 'a3']);
        expect(sugeridas[0].nombreObra).toBe('Obra o2');
        expect(sugeridas[0].distrito).toBe('El Tambo');
    });

    it('respeta el límite y descarta materiales u obras desconocidas', () => {
        expect(
            suggestReceivingObras({
                materialId: 'm1',
                origen: a1,
                almacenes: [a2, a3],
                obras,
                stock: {},
                materiales: [cemento],
                limite: 1,
            }),
        ).toHaveLength(1);

        expect(
            suggestReceivingObras({
                materialId: 'inexistente',
                origen: a1,
                almacenes: [a2, a3],
                obras,
                stock: {},
                materiales: [cemento],
            }),
        ).toEqual([]);

        expect(
            suggestReceivingObras({
                materialId: 'm1',
                origen: a1,
                almacenes: [a1],
                obras: {},
                stock: {},
                materiales: [cemento],
            }),
        ).toEqual([]);
    });

    it('ordena almacenes priorizando stock suficiente y cercanía', () => {
        const ranking = rankWarehousesForRequest({
            frenteCoords: a1.coords,
            materialId: 'm1',
            cantidadRequerida: 50,
            almacenes: [a3, a2, a1],
            obras,
            stock: { a1: { m1: 0 }, a2: { m1: 20 }, a3: { m1: 100 } },
        });

        expect(ranking[0].almacen.id).toBe('a3');
        expect(ranking[0].esOptimo).toBe(true);
        expect(ranking[0].tieneStockSuficiente).toBe(true);
        expect(ranking[1].almacen.id).toBe('a2');
        expect(ranking[2].almacen.id).toBe('a1');
        expect(ranking[2].stockDisponible).toBe(0);
    });

    it('no marca óptimo cuando nadie cubre la cantidad requerida', () => {
        const ranking = rankWarehousesForRequest({
            frenteCoords: a1.coords,
            materialId: 'm1',
            cantidadRequerida: 500,
            almacenes: [],
            obras,
            stock: {},
        });

        expect(ranking).toEqual([]);
    });

    it('calcula el centroide de las coordenadas', () => {
        expect(calculateCoordsCenter([])).toEqual({ lat: -12.068, lng: -75.21 });
        expect(
            calculateCoordsCenter([
                { lat: -12, lng: -75 },
                { lat: -13, lng: -76 },
            ]),
        ).toEqual({ lat: -12.5, lng: -75.5 });
    });
});
