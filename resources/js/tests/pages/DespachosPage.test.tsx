import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import DespachosPage from '../../pages/DespachosPage';
import { propsBase } from '../fixtures';
import { renderPagina } from '../harness';
import { llamadasHttp, router, setPageProps } from '../mocks/inertia';

const transferencias = [
    {
        id: 1,
        codigo: 'TR-001',
        motivo: 'Rebalance de stock',
        estado: 'aprobada',
        almacen_origen_id: 1,
        almacen_destino_id: 2,
        almacen_origen: { id: 1, nombre: 'Almacén Central' },
        almacen_destino: { id: 2, nombre: 'Almacén Frente 2' },
        detalles: [
            {
                id: 11,
                material_id: 1,
                cantidad_solicitada: 10,
                cantidad_despachada: null,
                material: {
                    id: 1,
                    nombre: 'Cemento Portland',
                    unidad_medida: { codigo: 'bol' },
                },
            },
            {
                id: 12,
                material_id: 2,
                cantidad_solicitada: 5,
                cantidad_despachada: null,
                material: null,
            },
        ],
    },
    {
        id: 2,
        codigo: 'TR-002',
        motivo: 'Traslado sin materiales',
        estado: 'aprobada',
        almacen_origen_id: 3,
        almacen_destino_id: 4,
        almacen_origen: null,
        almacen_destino: null,
        detalles: [],
    },
];

const despachos = [
    {
        id: 1,
        transferencia_id: 1,
        despachado_en: '2026-01-15T10:00:00.000Z',
        observaciones: 'Guía 123',
        despachador: { id: 1, nombre: 'Luis Quispe' },
        transferencia: transferencias[0],
    },
    {
        id: 2,
        transferencia_id: 2,
        despachado_en: null,
        observaciones: null,
        despachador: null,
        transferencia: transferencias[1],
    },
    {
        id: 3,
        transferencia_id: 9,
        despachado_en: null,
        observaciones: null,
        despachador: null,
        transferencia: null,
    },
    {
        id: 4,
        transferencia_id: 1,
        despachado_en: '2026-01-16T10:00:00.000Z',
        observaciones: null,
        despachador: { id: 2, nombre: 'Rosa Huamán' },
        transferencia: {
            ...transferencias[0],
            almacen_origen: null,
            almacen_destino: null,
            detalles: transferencias[0].detalles,
        },
    },
];

function renderDespachos() {
    return renderPagina(DespachosPage, {
        despachosDb: despachos,
        transferenciasDb: transferencias,
    });
}

function seleccionar(valor: string) {
    fireEvent.change(screen.getByRole('combobox'), {
        target: { value: valor },
    });
}

function enviar() {
    fireEvent.click(screen.getByRole('button', { name: /Registrar Despacho/ }));
}

describe('DespachosPage', () => {
    beforeEach(() => {
        setPageProps(propsBase());
    });

    it('lista despachos con rutas, materiales, responsables y estados', () => {
        renderDespachos();

        expect(screen.getAllByText('TR-001')[0]).toBeTruthy();
        expect(screen.getAllByText('En tránsito')[0]).toBeTruthy();
        expect(screen.getAllByText('Luis Quispe')[0]).toBeTruthy();
        expect(screen.getAllByText('Rosa Huamán')[0]).toBeTruthy();
        expect(screen.getAllByText('Sin asignar')[0]).toBeTruthy();
        expect(screen.getAllByText('Guía 123')[0]).toBeTruthy();
        expect(screen.getAllByText('→ Almacén Frente 2')[0]).toBeTruthy();
        expect(screen.getAllByText('→ Almacén #—')[0]).toBeTruthy();
        expect(screen.getAllByText('Almacén #1')[0]).toBeTruthy();
        expect(screen.getAllByText('#9')[0]).toBeTruthy();
        expect(screen.getAllByText('Cemento Portland (+1)')[0]).toBeTruthy();
        expect(screen.getAllByText('—')[0]).toBeTruthy();
    });

    it('muestra los estados vacíos del listado y del formulario', () => {
        renderPagina(DespachosPage, {
            despachosDb: [],
            transferenciasDb: [],
        });

        expect(screen.getByText('Sin despachos registrados')).toBeTruthy();
        expect(
            screen.getByText(
                'No hay transferencias aprobadas pendientes de despacho.',
            ),
        ).toBeTruthy();
    });

    it('valida que se seleccione una transferencia', () => {
        renderDespachos();

        enviar();

        expect(llamadasHttp).toHaveLength(0);
        expect(
            screen.getByText(
                'Selecciona la transferencia aprobada a despachar.',
            ),
        ).toBeTruthy();
    });

    it('exige cantidades mayores a cero', () => {
        renderDespachos();

        seleccionar('1');
        fireEvent.change(
            screen.getByLabelText('Cantidad a despachar de Cemento Portland'),
            { target: { value: '0' } },
        );
        fireEvent.change(
            screen.getByLabelText('Cantidad a despachar de Material #2'),
            { target: { value: '0' } },
        );
        enviar();

        expect(llamadasHttp).toHaveLength(0);
        expect(
            screen.getByText(
                'Indica una cantidad a despachar mayor a cero en al menos un material.',
            ),
        ).toBeTruthy();
    });

    it('selecciona, cambia de transferencia y limpia las líneas', () => {
        renderDespachos();

        seleccionar('1');
        expect(screen.getAllByText('Cemento Portland')[0]).toBeTruthy();
        expect(screen.getAllByText('Solicitado: 10 bol')[0]).toBeTruthy();
        expect(screen.getAllByText('Solicitado: 5 und')[0]).toBeTruthy();

        seleccionar('2');
        expect(screen.queryByText('Solicitado: 10 bol')).toBeNull();

        seleccionar('');
        expect(screen.queryByText('Solicitado: 10 bol')).toBeNull();
    });

    it('registra el despacho con observaciones y refresca props', () => {
        renderDespachos();

        seleccionar('1');
        fireEvent.change(
            screen.getByLabelText('Cantidad a despachar de Cemento Portland'),
            { target: { value: '8' } },
        );
        fireEvent.change(
            screen.getByLabelText('Cantidad a despachar de Material #2'),
            { target: { value: '3' } },
        );
        fireEvent.change(
            screen.getByPlaceholderText('Guía, transportista, incidencias…'),
            { target: { value: 'Guía 456' } },
        );
        enviar();

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/despachos',
                datos: {
                    transferencia_id: 1,
                    observaciones: 'Guía 456',
                    detalles: [
                        { id: 11, cantidad_despachada: 8 },
                        { id: 12, cantidad_despachada: 3 },
                    ],
                },
            }),
        );
        expect(router.reload).toHaveBeenCalledWith({
            only: ['despachosDb', 'transferenciasDb'],
        });
        expect(
            screen.getByText(
                'Despacho registrado; la transferencia está en tránsito.',
            ),
        ).toBeTruthy();
        expect(screen.queryByText('Solicitado: 10 bol')).toBeNull();
    });

    it('descarta líneas sin cantidad y omite observaciones vacías', () => {
        renderDespachos();

        seleccionar('1');
        fireEvent.change(
            screen.getByLabelText('Cantidad a despachar de Cemento Portland'),
            { target: { value: '0' } },
        );
        enviar();

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/despachos',
                datos: {
                    transferencia_id: 1,
                    observaciones: null,
                    detalles: [{ id: 12, cantidad_despachada: 5 }],
                },
            }),
        );
    });
});
