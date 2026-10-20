import { act, fireEvent, render, screen } from '@testing-library/react';
import L from 'leaflet';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('leaflet', () => {
    const crearNodo = (): Record<string, unknown> => {
        const eventos: Record<string, () => void> = {};
        const nodo: Record<string, unknown> = {
            eventos,
            addTo: vi.fn(() => nodo),
            remove: vi.fn(),
            removeLayer: vi.fn(),
            clearLayers: vi.fn(),
            addLayer: vi.fn(),
            bringToBack: vi.fn(),
            bindTooltip: vi.fn(() => nodo),
            bindPopup: vi.fn(() => nodo),
            invalidateSize: vi.fn(),
            flyTo: vi.fn(),
            on: vi.fn((evento: string, cb: () => void) => {
                eventos[evento] = cb;
                return nodo;
            }),
        };
        return nodo;
    };

    return {
        default: {
            map: vi.fn(() => crearNodo()),
            tileLayer: vi.fn(() => crearNodo()),
            layerGroup: vi.fn(() => crearNodo()),
            polyline: vi.fn(() => crearNodo()),
            marker: vi.fn(() => crearNodo()),
            divIcon: vi.fn(() => ({})),
            point: vi.fn((x: number, y: number) => ({ x, y })),
        },
    };
});

import { MapaLeaflet } from '../../components/MapaLeaflet';
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
    almacen(
        'alm-huerfano',
        'obra-huerfana',
        'Almacén Huérfano',
        'frente',
        -12.11,
        -75.26,
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
];

const stock: StockState = {
    stock: {
        'alm-central': { m1: 100, m2: 100, m3: 100 },
        'alm-eltambo': { m1: 80, m2: 100, m3: 100 },
        'alm-puentecunas': { m1: 0, m2: 100, m3: 100 },
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

const alHacerClic = vi.fn();

function renderMapa(props: Partial<ComponentProps<typeof MapaLeaflet>> = {}) {
    return render(
        <MapaLeaflet
            obras={obras}
            almacenes={almacenes}
            stock={stock}
            materiales={materiales}
            rutas={rutas}
            sugerencias={sugerencias}
            seleccionadaId="obra-central"
            resaltarAlertaOrigenId="alm-ielosandes"
            resaltarAlertaDestinoId="alm-puentecunas"
            onPinClick={alHacerClic}
            {...props}
        />,
    );
}

describe('components/MapaLeaflet', () => {
    it('inicializa el mapa y dibuja la interfaz de control', () => {
        const { container } = renderMapa({ className: 'extra' });

        expect(screen.getByText('Callejero (OSM)')).toBeTruthy();
        expect(screen.getByText('Satélite (Esri)')).toBeTruthy();
        expect(screen.getByText('Centrar Valle')).toBeTruthy();
        expect(screen.getByText('Simbología Operativa')).toBeTruthy();
        expect(screen.getByText('Despacho en tránsito')).toBeTruthy();
        expect(screen.getByText('Redistribución sugerida')).toBeTruthy();
        expect(screen.getByText('Todos los almacenes')).toBeTruthy();
        expect(vi.mocked(L.map)).toHaveBeenCalledTimes(1);
        expect((container.firstElementChild as Element).className).toContain(
            'extra',
        );
    });

    it('cambia a la capa satelital', () => {
        renderMapa();

        fireEvent.click(screen.getByText('Satélite (Esri)'));

        expect(vi.mocked(L.tileLayer)).toHaveBeenLastCalledWith(
            expect.stringContaining('arcgisonline'),
            expect.anything(),
        );
    });

    it('vuelve a la capa callejera', () => {
        renderMapa();

        fireEvent.click(screen.getByText('Satélite (Esri)'));
        fireEvent.click(screen.getByText('Callejero (OSM)'));

        expect(vi.mocked(L.tileLayer)).toHaveBeenLastCalledWith(
            expect.stringContaining('openstreetmap'),
            expect.anything(),
        );
    });

    it('recentra el mapa al Valle del Mantaro', () => {
        renderMapa();

        fireEvent.click(screen.getByText('Centrar Valle'));

        const mapa = vi.mocked(L.map).mock.results[0]?.value;

        expect(mapa.flyTo).toHaveBeenCalled();
    });

    it('filtra los pines por estado de stock', () => {
        renderMapa();

        vi.mocked(L.marker).mockClear();
        fireEvent.change(screen.getByRole('combobox'), {
            target: { value: 'critico' },
        });

        expect(vi.mocked(L.marker)).toHaveBeenCalledTimes(3);
    });

    it('oculta y muestra la leyenda', () => {
        renderMapa();

        fireEvent.click(screen.getByText('x'));
        expect(screen.queryByText('Simbología Operativa')).toBeNull();

        fireEvent.click(screen.getByText('Mostrar simbología'));
        expect(screen.getByText('Simbología Operativa')).toBeTruthy();
    });

    it('expone los handlers globales de los popups', () => {
        renderMapa();

        const win = window as unknown as {
            __cpmSelectObra?: (id: string) => void;
            __cpmSetObraActiva?: (id: string) => void;
            __cpmVerRedistribucion?: (
                obraId: string,
                almacenId: string,
            ) => void;
        };

        act(() => {
            win.__cpmSelectObra?.('obra-central');
        });
        expect(alHacerClic).toHaveBeenCalledWith('obra-central');

        const evento = vi.fn();
        window.addEventListener('cpm:set-obra-activa', evento);

        act(() => {
            win.__cpmSetObraActiva?.('obra-eltambo');
        });
        expect(alHacerClic).toHaveBeenCalledWith('obra-eltambo');
        expect(evento).toHaveBeenCalledTimes(1);

        window.removeEventListener('cpm:set-obra-activa', evento);

        const redistribucion = vi.fn();
        window.addEventListener('cpm:calcular-redistribucion', redistribucion);

        act(() => {
            win.__cpmVerRedistribucion?.('obra-chilca', 'alm-chilca');
        });
        expect(redistribucion).toHaveBeenCalledTimes(1);

        window.removeEventListener(
            'cpm:calcular-redistribucion',
            redistribucion,
        );
    });

    it('notifica el clic en los marcadores de almacén', () => {
        renderMapa();

        const marcadores = vi
            .mocked(L.marker)
            .mock.results.map((resultado) => resultado.value);

        let hubo = false;

        for (const marcador of marcadores) {
            const eventos = (
                marcador as unknown as {
                    eventos?: Record<string, () => void>;
                }
            ).eventos;

            if (eventos?.click) {
                eventos.click();
                hubo = true;
            }
        }

        expect(hubo).toBe(true);
        expect(alHacerClic).toHaveBeenCalled();
    });
});
