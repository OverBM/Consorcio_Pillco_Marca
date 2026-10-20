import { act, fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PanelGeneral from '../../pages/PanelGeneral';
import { propsBase } from '../fixtures';
import { renderPagina } from '../harness';
import { setPageProps } from '../mocks/inertia';

vi.setConfig({ testTimeout: 30000 });

const obras = [
    {
        id: 'obra-central',
        nombre: 'Mejoramiento Vía Huancayo',
        estado: 'activa' as const,
        distrito: 'Huancayo',
        responsable: 'Ing. Ana Torres',
        descripcion: 'Obra principal del programa',
        coords: { lat: -12.068, lng: -75.21 },
        fechaInicio: '2025-03-01',
        pctAvance: 62,
    },
    {
        id: 'obra-frente',
        nombre: 'Frente El Tambo',
        estado: 'en-cierre' as const,
        distrito: 'El Tambo',
        responsable: 'Ing. Luis Paredes',
        descripcion: 'Frente en proceso de cierre',
        coords: { lat: -12.05, lng: -75.22 },
        fechaInicio: '2025-04-15',
        pctAvance: 94,
    },
];

const almacenes = [
    {
        id: 'alm-central',
        obraId: 'obra-central',
        nombre: 'Almacén Central',
        tipo: 'central' as const,
        coords: { lat: -12.068, lng: -75.21 },
        capacidadM3: 1200,
    },
    {
        id: 'alm-frente',
        obraId: 'obra-frente',
        nombre: 'Almacén Frente 2',
        tipo: 'frente' as const,
        coords: { lat: -12.05, lng: -75.22 },
        capacidadM3: 400,
    },
];

const materiales = [
    {
        id: 'mat-cemento-1',
        nombre: 'Cemento Portland',
        categoria: 'Cemento' as const,
        unidad: 'bol',
        stockMinimo: 100,
    },
    {
        id: 'mat-acero-1',
        nombre: 'Acero corrugado 1/2"',
        categoria: 'Acero' as const,
        unidad: 'kg',
        stockMinimo: 200,
    },
    {
        id: 'mat-agregado-1',
        nombre: 'Arena gruesa',
        categoria: 'Agregados' as const,
        unidad: 'm3',
        stockMinimo: 50,
    },
    {
        id: 'mat-tuberia-1',
        nombre: 'Tubería PVC 4"',
        categoria: 'Tuberías' as const,
        unidad: 'und',
        stockMinimo: 30,
    },
];

const stock = {
    stock: {
        'alm-central': {
            'mat-cemento-1': 500,
            'mat-acero-1': 450,
            'mat-agregado-1': 20,
            'mat-tuberia-1': 80,
        },
        'alm-frente': {
            'mat-cemento-1': 40,
            'mat-acero-1': 120,
            'mat-agregado-1': 10,
            'mat-tuberia-1': 5,
        },
    },
    reservas: {},
};

const sobrantes = [
    {
        id: 'sobrante-1',
        tipo: 'sobrante',
        materialId: 'mat-cemento-1',
        almacenId: 'alm-central',
        obraId: 'obra-frente',
        cantidad: 120,
        unidad: 'bol',
        mensaje: 'Excedente detectado por cierre de obra.',
        receptoras: [
            {
                almacenId: 'alm-frente',
                obraId: 'obra-frente',
                nombreObra: 'Frente El Tambo',
                distrito: 'El Tambo',
                km: 2.4,
            },
        ],
    },
    {
        id: 'sobrante-2',
        tipo: 'sobrante',
        materialId: 'mat-desconocido',
        almacenId: 'alm-frente',
        obraId: 'obra-central',
        cantidad: 25,
        unidad: 'kg',
        mensaje: 'Material sin catálogo vigente.',
        receptoras: [],
    },
];

const rutas = [
    {
        id: 'ruta-1',
        codigo: 'TR-001',
        origenId: 'alm-central',
        destinoId: 'alm-frente',
        estado: 'en-transito' as const,
    },
];

const indicadores = {
    solicitudes: 12,
    requerimientosSobrecosto: 3,
    ocFletes: 5,
    stockCritico: 4,
    transferencias: 6,
    incidencias: 2,
    mermas: 1,
};

const movimientos7d = [
    { fecha: '2026-01-10', etiqueta: 'Lun', ingreso: 120, salida: 80 },
    { fecha: '2026-01-11', etiqueta: 'Mar', ingreso: 90, salida: 60 },
];

function propsPanel() {
    return {
        obrasDb: obras,
        almacenesDb: almacenes,
        materialesDb: materiales,
        stock,
        indicadores,
        sobrantes,
        rutas,
        movimientos7d,
        obraActivaId: 'obra-central',
    };
}

function montarPanel(extra: Record<string, unknown> = propsPanel()) {
    setPageProps({ ...propsBase(), ...extra });

    return renderPagina(PanelGeneral);
}

describe('PanelGeneral', () => {
    beforeEach(() => {
        setPageProps(propsBase());
    });

    it('muestra los indicadores, excedentes y accesos del panel', () => {
        montarPanel();

        expect(screen.getAllByText('Solicitudes')[0]).toBeTruthy();
        expect(screen.getAllByText('12')[0]).toBeTruthy();
        expect(screen.getAllByText('4')[0]).toBeTruthy();
        expect(
            screen.getAllByText(
                'Redistribución de excedentes por cierre de obra',
            )[0],
        ).toBeTruthy();
        expect(
            screen.getAllByText('Cemento Portland: 120 bolsas')[0],
        ).toBeTruthy();
        expect(screen.getAllByText('Frente El Tambo')[0]).toBeTruthy();
        expect(
            screen.getAllByText('Generar orden de transferencia')[0],
        ).toBeTruthy();
        expect(screen.getAllByText('Matriz de Stock')[0]).toBeTruthy();
        expect(screen.getAllByText('Huancayo · Junín')[0]).toBeTruthy();
        expect(screen.getAllByText('Ingresos a almacén')[0]).toBeTruthy();
    });

    it('resalta la ruta al pasar el cursor por una alerta', () => {
        const { container } = montarPanel();

        const alerta = screen
            .getAllByText('Cemento Portland: 120 bolsas')[0]
            .closest('.transition-transform');

        expect(alerta).toBeTruthy();

        if (alerta) {
            fireEvent.mouseEnter(alerta);
            fireEvent.mouseLeave(alerta);
        }

        expect(
            container.querySelector('.leaflet-redistribucion-path'),
        ).toBeTruthy();
    });

    it('interactúa con los controles del mapa y la comparativa', () => {
        montarPanel();

        fireEvent.click(screen.getAllByText('Satélite (Esri)')[0]);
        fireEvent.click(screen.getAllByText('Callejero (OSM)')[0]);
        fireEvent.click(screen.getAllByText('Centrar Valle')[0]);
        fireEvent.change(screen.getAllByRole('combobox')[0], {
            target: { value: 'critico' },
        });
        fireEvent.click(screen.getAllByText('x')[0]);
        fireEvent.click(screen.getAllByText('Mostrar simbología')[0]);

        const selectorComparar = screen
            .getByRole('option', { name: /Agregar frente/ })
            .closest('select');

        expect(selectorComparar).toBeTruthy();

        if (selectorComparar) {
            fireEvent.change(selectorComparar, {
                target: { value: 'obra-frente' },
            });
        }

        expect(
            screen.getAllByTitle('Quitar de comparación').length,
        ).toBeGreaterThan(0);
        fireEvent.click(screen.getAllByTitle('Quitar de comparación')[0]);
        fireEvent.click(screen.getAllByText('Fijar activa')[0]);
        expect(screen.getAllByText('94%')[0]).toBeTruthy();
    });

    it('calcula y descarta una redistribución sugerida', () => {
        montarPanel();

        fireEvent.click(screen.getAllByText('Calcular redistribución')[0]);

        expect(
            screen.getAllByText('Redistribución sugerida por cercanía')[0],
        ).toBeTruthy();
        expect(screen.getAllByText('Generar transferencia')[0]).toBeTruthy();

        fireEvent.click(screen.getAllByTitle('Descartar predicción')[0]);
        expect(
            screen.queryByText('Redistribución sugerida por cercanía'),
        ).toBeNull();
    });

    it('atiende los eventos globales del mapa y cierra el detalle', () => {
        montarPanel();

        act(() => {
            window.dispatchEvent(
                new CustomEvent('cpm:set-obra-activa', {
                    detail: { obraId: 'obra-frente' },
                }),
            );
        });

        expect(screen.getAllByText('Almacén Frente 2')[0]).toBeTruthy();
        expect(screen.getAllByText('Copiar coords.')[0]).toBeTruthy();

        fireEvent.click(screen.getAllByLabelText('Cerrar')[0]);
        expect(screen.queryByText('Copiar coords.')).toBeNull();

        act(() => {
            window.dispatchEvent(
                new CustomEvent('cpm:calcular-redistribucion', {
                    detail: { obraId: 'obra-frente', almacenId: 'alm-frente' },
                }),
            );
        });

        expect(
            screen.getAllByText('Redistribución sugerida por cercanía')[0],
        ).toBeTruthy();
    });

    it('muestra estados vacíos cuando no hay datos de red', () => {
        montarPanel({
            obrasDb: [],
            almacenesDb: [],
            materialesDb: [],
            stock: { stock: {}, reservas: {} },
            indicadores: {
                solicitudes: 0,
                requerimientosSobrecosto: 0,
                ocFletes: 0,
                stockCritico: 0,
                transferencias: 0,
                incidencias: 0,
                mermas: 0,
            },
            sobrantes: [],
            rutas: [],
            movimientos7d: [],
            obraActivaId: null,
        });

        expect(
            screen.getAllByText('Sin excedentes por redistribuir')[0],
        ).toBeTruthy();
        expect(
            screen.getAllByText('Ningún frente seleccionado')[0],
        ).toBeTruthy();
    });
});
