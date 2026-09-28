// Lógica geográfica SIMULADA del prototipo.
// Las coordenadas son aproximaciones reales de la zona Huancayo/Valle del Mantaro
// (Junín, Perú); todos los cálculos son ilustrativos para el demo.

import type { Almacen, Coord, Material, Obra, ObraReceptoraSugerida } from '../types';

/** Dimensiones del viewBox del mapa esquemático `MapaSchematic` (SVG). */
export const MAP_W = 1000;
export const MAP_H = 450;

const PAD = 48;

/** Ventana proyectable: abarca Huancayo, El Tambo, Chilca, Chupaca, San Jerónimo. */
export const MAP_BOUNDS = {
    latMin: -12.2,
    latMax: -11.92,
    lngMin: -75.34,
    lngMax: -75.12,
} as const;

/**
 * Proyecta coordenadas (lat/lng) de la zona del Valle del Mantaro a coordenadas
 * x/y dentro del viewBox del mapa esquemático (1000×450). Los valores fuera de
 * la ventana se recortan al borde (p. ej. la etiqueta de Jauja, más al norte).
 */
export function projectToMap(lat: number, lng: number): { x: number; y: number } {
    const { latMin, latMax, lngMin, lngMax } = MAP_BOUNDS;
    const nx = Math.min(1, Math.max(0, (lng - lngMin) / (lngMax - lngMin)));
    const ny = Math.min(1, Math.max(0, (lat - latMin) / (latMax - latMin)));
    return {
        x: round1(PAD + nx * (MAP_W - 2 * PAD)),
        y: round1((MAP_H - PAD) - ny * (MAP_H - 2 * PAD)),
    };
}

/** Formato geográfico de un punto: `12.0680° S · 75.2340° O`. */
export function formatCoordenadas(lat: number, lng: number): string {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'O';
    return `${Math.abs(lat).toFixed(4)}° ${latDir} · ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}

/** Distancia haversine (km) entre dos coordenadas. Radio terrestre 6371 km. */
export function haversineDistanceKm(a: Coord, b: Coord): number {
    const R = 6371;
    const dLat = deg2rad(b.lat - a.lat);
    const dLng = deg2rad(b.lng - a.lng);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(deg2rad(a.lat)) * Math.cos(deg2rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return round2(2 * R * Math.asin(Math.sqrt(h)));
}

function deg2rad(deg: number): number {
    return (deg * Math.PI) / 180;
}

function round1(n: number): number {
    return Math.round(n * 10) / 10;
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

interface SuggestInput {
    /** Material sobrante a redistribuir. */
    materialId: string;
    /** Almacén origen (obra cerrada/sobrante). */
    origen: Almacen;
    /** Todos los almacenes del sistema. */
    almacenes: Almacen[];
    /** Obras por id. */
    obras: Record<string, Obra>;
    /** Stock actual por almacén: almacenId -> materialId -> cantidad. */
    stock: Record<string, Record<string, number>>;
    /** Catálogo de materiales (para comparar con el mínimo). */
    materiales: Material[];
    /** Máximo número de receptoras a retornar. */
    limite?: number;
}

/**
 * Obtiene las obras ACTIVAS con déficit o stock crítico del material sobrante y
 * las ordena por cercanía geográfica (haversine) desde el almacén origen.
 * Es la "redistribución inteligente por cercanía" del demo.
 */
export function suggestReceivingObras({
    materialId,
    origen,
    almacenes,
    obras,
    stock,
    materiales,
    limite = 3,
}: SuggestInput): ObraReceptoraSugerida[] {
    const material = materiales.find((m) => m.id === materialId);

    const candidatas = almacenes
        .filter((alm) => {
            const obra = obras[alm.obraId];
            if (!obra || obra.estado !== 'activa') {
                return false;
            }
            const cantidad = stock[alm.id]?.[materialId] ?? 0;
            return material !== undefined && cantidad < material.stockMinimo;
        })
        .map((alm) => {
            const obra = obras[alm.obraId];
            const km = haversineDistanceKm(origen.coords, alm.coords);
            return {
                almacenId: alm.id,
                obraId: alm.obraId,
                nombreObra: obra.nombre,
                distrito: obra.distrito,
                km,
            };
        })
        .sort((a, b) => a.km - b.km);

    return candidatas.slice(0, limite);
}

export interface RankedWarehouseResult {
    almacen: Almacen;
    obra?: Obra;
    distanciaKm: number;
    stockDisponible: number;
    tieneStockSuficiente: boolean;
    esOptimo: boolean;
}

/**
 * Ordena TODOS los almacenes registrados evaluando conjuntamente distancia geográfica (GPS)
 * y disponibilidad de stock (Bizagi 23, 24, 25).
 */
export function rankWarehousesForRequest({
    frenteCoords,
    materialId,
    cantidadRequerida,
    almacenes,
    obras,
    stock,
}: {
    frenteCoords: Coord;
    materialId: string;
    cantidadRequerida: number;
    almacenes: Almacen[];
    obras: Record<string, Obra>;
    stock: Record<string, Record<string, number>>;
}): RankedWarehouseResult[] {
    const list = almacenes.map((alm) => {
        const distanciaKm = haversineDistanceKm(frenteCoords, alm.coords);
        const stockDisponible = stock[alm.id]?.[materialId] ?? 0;
        const tieneStockSuficiente = stockDisponible >= cantidadRequerida;
        const obra = obras[alm.obraId];

        return {
            almacen: alm,
            obra,
            distanciaKm,
            stockDisponible,
            tieneStockSuficiente,
            esOptimo: false,
        };
    });

    // Ordenar priorizando:
    // 1. Almacenes con stock suficiente (ordenados por menor distancia km)
    // 2. Almacenes con stock parcial > 0 (ordenados por disponibilidad desc y distancia asc)
    // 3. Almacenes sin stock (ordenados por menor distancia km)
    list.sort((a, b) => {
        if (a.tieneStockSuficiente && !b.tieneStockSuficiente) return -1;
        if (!a.tieneStockSuficiente && b.tieneStockSuficiente) return 1;

        if (a.stockDisponible > 0 && b.stockDisponible === 0) return -1;
        if (a.stockDisponible === 0 && b.stockDisponible > 0) return 1;

        return a.distanciaKm - b.distanciaKm;
    });

    if (list.length > 0 && list[0].tieneStockSuficiente) {
        list[0].esOptimo = true;
    }

    return list;
}

/**
 * Calcula el centroide geométrico de un conjunto dinámico de coordenadas.
 */
export function calculateCoordsCenter(coords: Coord[]): Coord {
    if (coords.length === 0) {
        return { lat: -12.068, lng: -75.21 }; // Huancayo centro default
    }
    const sum = coords.reduce(
        (acc, c) => ({ lat: acc.lat + c.lat, lng: acc.lng + c.lng }),
        { lat: 0, lng: 0 },
    );
    return {
        lat: round2(sum.lat / coords.length),
        lng: round2(sum.lng / coords.length),
    };
}