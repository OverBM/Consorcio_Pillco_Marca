import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GeoDetalle } from '../../components/GeoDetalle';
import type { Almacen, Material, Obra } from '../../types';
import type { StockState } from '../../types/stock';

const obras: Obra[] = [
    {
        id: 'obra-central',
        nombre: 'Obra Central',
        estado: 'activa',
        distrito: 'San Jerónimo',
        responsable: 'Ing. Ana',
        descripcion: '',
        coords: { lat: -12.06, lng: -75.21 },
        fechaInicio: '2025-01-01',
        pctAvance: 40,
    },
    {
        id: 'obra-eltambo',
        nombre: 'Frente El Tambo',
        estado: 'activa',
        distrito: 'El Tambo',
        responsable: 'Ing. Beto',
        descripcion: '',
        coords: { lat: -12.05, lng: -75.2 },
        fechaInicio: '2025-02-01',
        pctAvance: 55,
    },
    {
        id: 'obra-chilca',
        nombre: 'Conexión Chilca',
        estado: 'en-cierre',
        distrito: 'Chilca',
        responsable: 'Ing. Carla',
        descripcion: '',
        coords: { lat: -12.08, lng: -75.19 },
        fechaInicio: '2025-03-01',
        pctAvance: 90,
    },
];

const almacenes: Almacen[] = [
    {
        id: 'alm-central',
        obraId: 'obra-central',
        nombre: 'Almacén Central',
        tipo: 'central',
        coords: { lat: -12.06, lng: -75.21 },
        capacidadM3: 500,
    },
    {
        id: 'alm-eltambo',
        obraId: 'obra-eltambo',
        nombre: 'Almacén El Tambo',
        tipo: 'frente',
        coords: { lat: -12.05, lng: -75.2 },
        capacidadM3: 200,
    },
    {
        id: 'alm-chilca',
        obraId: 'obra-chilca',
        nombre: 'Almacén Chilca',
        tipo: 'frente',
        coords: { lat: -12.08, lng: -75.19 },
        capacidadM3: 150,
    },
];

const materiales: Material[] = [
    {
        id: 'm1',
        nombre: 'Cemento Portland',
        categoria: 'Cemento',
        unidad: 'bol',
        stockMinimo: 100,
    },
    {
        id: 'm2',
        nombre: 'Acero corrugado',
        categoria: 'Acero',
        unidad: 'kg',
        stockMinimo: 50,
    },
    {
        id: 'm3',
        nombre: 'Arena gruesa',
        categoria: 'Agregados',
        unidad: 'm3',
        stockMinimo: 200,
    },
];

const stock: StockState = {
    stock: {
        'alm-central': { m1: 100, m2: 25, m3: 0 },
        'alm-eltambo': { m1: 200, m2: 100, m3: 400 },
        'alm-chilca': { m1: 50, m2: 10, m3: 0 },
    },
    reservas: {},
};

const writeText = vi.fn<(texto: string) => Promise<void>>();

beforeEach(() => {
    writeText.mockReset();
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        configurable: true,
    });
});

describe('components/GeoDetalle', () => {
    it('muestra la ficha, distancias y stock ordenado del almacén central', () => {
        const alCerrar = vi.fn();

        render(
            <GeoDetalle
                alm={almacenes[0]}
                obras={obras}
                almacenes={almacenes}
                stock={stock}
                materiales={materiales}
                onClose={alCerrar}
            />,
        );

        expect(screen.getByText('Almacén Central')).toBeTruthy();
        expect(screen.getAllByText('Crítico')).toHaveLength(3);
        expect(screen.getByText('Óptimo')).toBeTruthy();
        expect(screen.getByText('Punto central')).toBeTruthy();
        expect(screen.getAllByText('Frente El Tambo')).toHaveLength(2);
        expect(screen.getByText('Acero corrugado')).toBeTruthy();
        expect(screen.getByText('Acero')).toBeTruthy();
        expect(screen.getByText('Ver en Matriz de Stock')).toBeTruthy();

        fireEvent.click(screen.getByLabelText('Cerrar'));
        expect(alCerrar).toHaveBeenCalledTimes(1);
    });

    it('calcula la distancia al almacén central para un frente', () => {
        render(
            <GeoDetalle
                alm={almacenes[1]}
                obras={obras}
                almacenes={almacenes}
                stock={stock}
                materiales={materiales}
            />,
        );

        expect(screen.queryByText('Punto central')).toBeNull();
        expect(screen.getAllByText(/\d+(\.\d+)? km/).length).toBeGreaterThan(0);
        expect(screen.queryByLabelText('Cerrar')).toBeNull();
    });

    it('muestra un guion cuando no existe almacén central', () => {
        render(
            <GeoDetalle
                alm={almacenes[1]}
                obras={obras}
                almacenes={[almacenes[1], almacenes[2]]}
                stock={stock}
                materiales={materiales}
            />,
        );

        expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    });

    it('informa cuando no hay otros puntos en la red', () => {
        render(
            <GeoDetalle
                alm={almacenes[0]}
                obras={obras}
                almacenes={[almacenes[0]]}
                stock={stock}
                materiales={materiales}
            />,
        );

        expect(screen.getByText('Sin otros puntos en la red.')).toBeTruthy();
    });

    it('informa cuando no hay materiales registrados', () => {
        render(
            <GeoDetalle
                alm={almacenes[0]}
                obras={obras}
                almacenes={almacenes}
                stock={stock}
                materiales={[]}
            />,
        );

        expect(screen.getByText('Sin materiales registrados')).toBeTruthy();
    });

    it('trata como cerrada una obra ausente y usa el nombre del almacén', () => {
        const sinObra: Almacen = {
            id: 'alm-x',
            obraId: 'obra-x',
            nombre: 'Almacén Sin Obra',
            tipo: 'frente',
            coords: { lat: -12.07, lng: -75.23 },
            capacidadM3: 100,
        };
        const vecino: Almacen = {
            id: 'alm-y',
            obraId: 'obra-y',
            nombre: 'Almacén Vecino',
            tipo: 'frente',
            coords: { lat: -12.065, lng: -75.22 },
            capacidadM3: 100,
        };

        render(
            <GeoDetalle
                alm={sinObra}
                obras={obras}
                almacenes={[sinObra, vecino]}
                stock={{
                    stock: { 'alm-x': { m1: 250, m2: 500, m3: 0 } },
                    reservas: {},
                }}
                materiales={materiales}
            />,
        );

        expect(screen.getAllByText('Sobrante por cierre')).toHaveLength(3);
        expect(screen.getAllByText('Almacén Vecino')).toHaveLength(2);
    });

    it('copia las coordenadas y confirma con "Copiado"', async () => {
        render(
            <GeoDetalle
                alm={almacenes[0]}
                obras={obras}
                almacenes={almacenes}
                stock={stock}
                materiales={materiales}
            />,
        );

        fireEvent.click(screen.getByText('Copiar coords.'));

        expect(await screen.findByText('Copiado')).toBeTruthy();
        expect(writeText).toHaveBeenCalledTimes(1);
    });

    it('mantiene el botón si falla el copiado', async () => {
        writeText.mockRejectedValue(new Error('sin permiso'));

        render(
            <GeoDetalle
                alm={almacenes[0]}
                obras={obras}
                almacenes={almacenes}
                stock={stock}
                materiales={materiales}
            />,
        );

        await act(async () => {
            fireEvent.click(screen.getByText('Copiar coords.'));
        });

        expect(screen.getByText('Copiar coords.')).toBeTruthy();
        expect(screen.queryByText('Copiado')).toBeNull();
    });
});
