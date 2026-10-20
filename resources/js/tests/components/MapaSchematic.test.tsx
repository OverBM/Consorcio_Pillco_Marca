import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { MapaSchematic } from '../../components/MapaSchematic';
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
        id: 'obra-puentecunas',
        nombre: 'Puente Cunas',
        estado: 'activa',
        distrito: 'San Agustín',
        responsable: 'Ing. Carla',
        descripcion: '',
        coords: { lat: -12.1, lng: -75.25 },
        fechaInicio: '2025-03-01',
        pctAvance: 70,
    },
    {
        id: 'obra-chilca',
        nombre: 'Conexión Chilca',
        estado: 'en-cierre',
        distrito: 'Chilca',
        responsable: 'Ing. Diego',
        descripcion: '',
        coords: { lat: -12.08, lng: -75.19 },
        fechaInicio: '2024-08-01',
        pctAvance: 95,
    },
    {
        id: 'obra-ielosandes',
        nombre: 'IE Los Andes',
        estado: 'cerrada',
        distrito: 'El Tambo',
        responsable: 'Ing. Elena',
        descripcion: '',
        coords: { lat: -12.04, lng: -75.18 },
        fechaInicio: '2024-01-01',
        pctAvance: 100,
    },
];

function almacen(
    id: string,
    obraId: string,
    nombre: string,
    tipo: Almacen['tipo'],
    lat: number,
    lng: number,
): Almacen {
    return {
        id,
        obraId,
        nombre,
        tipo,
        coords: { lat, lng },
        capacidadM3: 200,
    };
}

const almacenes: Almacen[] = [
    almacen(
        'alm-central',
        'obra-central',
        'Almacén Central',
        'central',
        -12.06,
        -75.21,
    ),
    almacen(
        'alm-eltambo',
        'obra-eltambo',
        'Almacén El Tambo',
        'frente',
        -12.05,
        -75.2,
    ),
    almacen(
        'alm-puentecunas',
        'obra-puentecunas',
        'Almacén Cunas',
        'cantera',
        -12.1,
        -75.25,
    ),
    almacen(
        'alm-chilca',
        'obra-chilca',
        'Almacén Chilca',
        'frente',
        -12.08,
        -75.19,
    ),
    almacen(
        'alm-ielosandes',
        'obra-ielosandes',
        'Almacén Los Andes',
        'frente',
        -12.04,
        -75.18,
    ),
];

function material(id: string, nombre: string): Material {
    return {
        id,
        nombre,
        categoria: 'Cemento',
        unidad: 'bol',
        stockMinimo: 100,
    };
}

const materiales: Material[] = [
    material('m1', 'Cemento Portland'),
    material('m2', 'Acero corrugado'),
    material('m3', 'Arena gruesa'),
    material('m4', 'Piedra chancada'),
];

const stock: StockState = {
    stock: {
        'alm-central': { m1: 100, m2: 100, m3: 100, m4: 100 },
        'alm-eltambo': { m1: 80, m2: 100, m3: 100, m4: 100 },
        'alm-puentecunas': { m1: 0, m2: 100, m3: 100, m4: 100 },
        'alm-chilca': { m1: 50 },
        'alm-ielosandes': { m1: 250 },
    },
    reservas: {},
};

const rutas = [
    {
        id: 'r1',
        codigo: 'DSP-01',
        origenId: 'alm-central',
        destinoId: 'alm-eltambo',
        estado: 'en-transito' as const,
    },
    {
        id: 'r2',
        codigo: 'DSP-02',
        origenId: 'alm-eltambo',
        destinoId: 'alm-puentecunas',
        estado: 'pendiente' as const,
    },
    {
        id: 'r3',
        codigo: 'DSP-03',
        origenId: 'alm-inexistente',
        destinoId: 'alm-central',
        estado: 'pendiente' as const,
    },
];

const sugerencias = [
    { origenId: 'alm-ielosandes', destinoId: 'alm-puentecunas' },
    { origenId: 'alm-inexistente', destinoId: 'alm-central' },
];

function pin(destino: string): Element {
    const titulos = Array.from(document.querySelectorAll('svg title'));
    const titulo = titulos.find((nodo) => nodo.textContent === destino);

    if (!titulo) {
        throw new Error(`No se encontró el pin: ${destino}`);
    }

    return titulo.parentElement as Element;
}

function renderMapa(props: Partial<ComponentProps<typeof MapaSchematic>> = {}) {
    return render(
        <MapaSchematic
            obras={obras}
            almacenes={almacenes}
            stock={stock}
            materiales={materiales}
            rutas={rutas}
            sugerencias={sugerencias}
            {...props}
        />,
    );
}

describe('components/MapaSchematic', () => {
    it('dibuja pines, rutas válidas y leyenda', () => {
        const { container } = renderMapa({ className: 'extra' });

        expect(screen.getByRole('img')).toBeTruthy();
        expect(screen.getByText('DSP-01')).toBeTruthy();
        expect(screen.getByText('DSP-02')).toBeTruthy();
        expect(screen.queryByText('DSP-03')).toBeNull();
        expect(screen.getByText('Buscar distrito…')).toBeTruthy();
        expect(screen.getByText('Central')).toBeTruthy();
        expect(screen.getByText('Sobrante / cierre')).toBeTruthy();
        expect(screen.getByText('Redistribución sugerida')).toBeTruthy();
        expect(
            screen.getByText('Mapa esquemático · sin tiles externos'),
        ).toBeTruthy();
        expect((container.firstElementChild as Element).className).toContain(
            'extra',
        );
    });

    it('alterna entre vista mapa y satélite', () => {
        renderMapa();

        fireEvent.click(screen.getByText('Satélite'));
        expect(
            screen.getByText('Vista satélite simulada · sin tiles externos'),
        ).toBeTruthy();

        fireEvent.click(screen.getByText('Mapa'));
        expect(
            screen.getByText('Mapa esquemático · sin tiles externos'),
        ).toBeTruthy();
    });

    it('muestra el tooltip resumido al pasar el cursor', () => {
        renderMapa();

        const central = pin('Alm. Central San Jerónimo — Óptimo');
        fireEvent.mouseOver(central);

        const tooltip = screen.getByRole('tooltip');
        expect(within(tooltip).getByText('Cemento Portland')).toBeTruthy();
        expect(within(tooltip).getByText('+1 materiales más')).toBeTruthy();

        fireEvent.mouseOut(central);
        expect(screen.queryByRole('tooltip')).toBeNull();
    });

    it('abre el detalle ampliado al hacer clic en un pin', () => {
        const alHacerClic = vi.fn();
        renderMapa({ onPinClick: alHacerClic, seleccionadaId: 'obra-central' });

        fireEvent.click(pin('Frente El Tambo — Stock bajo'));

        expect(alHacerClic).toHaveBeenCalledWith('obra-eltambo');
        expect(screen.getByText('Copiar coords.')).toBeTruthy();

        fireEvent.click(screen.getByLabelText('Cerrar detalle de almacén'));
        expect(screen.queryByText('Copiar coords.')).toBeNull();
    });

    it('cierra el popup desde el botón del propio detalle', () => {
        renderMapa();

        fireEvent.click(pin('Puente Cunas — Crítico'));
        expect(screen.getByText('Copiar coords.')).toBeTruthy();

        fireEvent.click(screen.getByLabelText('Cerrar'));
        expect(screen.queryByText('Copiar coords.')).toBeNull();
    });

    it('resalta el pin de cierre con etiqueta lateral', () => {
        renderMapa();

        const cierre = pin('IE Los Andes (cierre) — Sobrante por cierre');
        fireEvent.mouseOver(cierre);

        expect(screen.getByRole('tooltip')).toBeTruthy();
        expect(screen.getByText('El Tambo · cierre')).toBeTruthy();
    });

    it('no muestra tooltip cuando el almacén no tiene materiales', () => {
        renderMapa({
            almacenes: [almacenes[3]],
            materiales: [],
            rutas: [],
            sugerencias: [],
        });

        const inactivo = pin('Conexión Chilca — Óptimo');
        fireEvent.mouseOver(inactivo);
        expect(screen.queryByRole('tooltip')).toBeNull();
    });
});
