import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import RecepcionPage from '../../pages/RecepcionPage';
import { propsBase } from '../fixtures';
import { renderPagina } from '../harness';
import { llamadasHttp, router, setPageProps } from '../mocks/inertia';

const recepciones = [
    {
        id: 1,
        codigo: 'REC-001',
        almacen_id: 1,
        orden_compra_id: 1,
        guia_remision: 'GR-001',
        estado: 'conforme',
        recibida_en: '2026-01-10T08:00:00.000Z',
        observaciones: 'Sin incidencias',
        almacen: {
            id: 1,
            nombre: 'Almacén Central',
            obra: { nombre: 'Obra Huancayo' },
        },
        orden_compra: {
            id: 1,
            codigo: 'OC-001',
            proveedor: { razon_social: 'Ferretería Andina' },
        },
        almacenero: { id: 2, name: 'Pedro Ramos' },
        detalles: [
            {
                id: 11,
                material_id: 1,
                cantidad_ordenada: 10,
                cantidad_recibida: 10,
                material: {
                    id: 1,
                    nombre: 'Cemento Portland',
                    unidad_medida: { codigo: 'bol' },
                },
            },
            {
                id: 12,
                material_id: 2,
                cantidad_ordenada: 5,
                cantidad_recibida: 4,
                material: null,
            },
        ],
    },
    {
        id: 2,
        codigo: 'REC-002',
        almacen_id: 2,
        orden_compra_id: 2,
        guia_remision: null,
        estado: 'en_verificacion',
        recibida_en: '2026-01-11T08:00:00.000Z',
        observaciones: null,
        almacen: null,
        orden_compra: null,
        almacenero: null,
        detalles: [],
    },
    {
        id: 3,
        codigo: 'REC-003',
        almacen_id: 1,
        orden_compra_id: 3,
        guia_remision: 'GR-003',
        estado: 'observada',
        recibida_en: '2026-01-12T08:00:00.000Z',
        observaciones: 'Falta de material',
        almacen: { id: 1, nombre: 'Almacén Central', obra: null },
        orden_compra: {
            id: 3,
            codigo: 'OC-003',
            proveedor: null,
        },
        almacenero: null,
        detalles: [
            {
                id: 31,
                material_id: 4,
                cantidad_ordenada: '3',
                cantidad_recibida: '3',
                material: null,
            },
        ],
    },
    {
        id: 4,
        codigo: 'REC-004',
        almacen_id: 1,
        orden_compra_id: 4,
        guia_remision: null,
        estado: 'anulada',
        recibida_en: '2026-01-13T08:00:00.000Z',
        observaciones: null,
        almacen: { id: 1, nombre: 'Almacén Central' },
        orden_compra: { id: 4, codigo: 'OC-004', proveedor: null },
        almacenero: null,
        detalles: [],
    },
];

const ordenes = [
    {
        id: 1,
        codigo: 'OC-001',
        almacen_destino_id: 1,
        estado: 'emitida',
        proveedor: { id: 1, razon_social: 'Ferretería Andina' },
        detalles: [
            {
                id: 11,
                material_id: 1,
                cantidad: '10',
                material: {
                    id: 1,
                    nombre: 'Cemento Portland',
                    unidad_medida: { codigo: 'bol' },
                },
            },
            { id: 12, material_id: 2, cantidad: 5, material: null },
        ],
    },
    {
        id: 2,
        codigo: 'OC-002',
        almacen_destino_id: 2,
        estado: 'emitida',
        proveedor: null,
        detalles: [],
    },
];

function renderRecepcion() {
    return renderPagina(RecepcionPage, {
        recepcionesDb: recepciones,
        ordenesDb: ordenes,
    });
}

function seleccionarOrden(valor: string) {
    fireEvent.change(screen.getByRole('combobox'), {
        target: { value: valor },
    });
}

function enviar() {
    fireEvent.click(
        screen.getByRole('button', {
            name: /Registrar Recepción Conforme/,
        }),
    );
}

describe('RecepcionPage', () => {
    beforeEach(() => {
        setPageProps(propsBase());
    });

    it('lista las recepciones con origen, material y estados', () => {
        renderRecepcion();

        expect(screen.getAllByText('REC-001')[0]).toBeTruthy();
        expect(screen.getAllByText('OC-001')[0]).toBeTruthy();
        expect(screen.getAllByText('Ferretería Andina')[0]).toBeTruthy();
        expect(screen.getAllByText('Cemento Portland (+1)')[0]).toBeTruthy();
        expect(screen.getAllByText('Almacén Central')[0]).toBeTruthy();
        expect(screen.getAllByText('Conforme')[0]).toBeTruthy();
        expect(screen.getAllByText('En verificación')[0]).toBeTruthy();
        expect(screen.getAllByText('Observada')[0]).toBeTruthy();
        expect(screen.getAllByText('anulada')[0]).toBeTruthy();
        expect(screen.getAllByText('OC #2')[0]).toBeTruthy();
        expect(screen.getAllByText('Material #4')[0]).toBeTruthy();
        expect(screen.getAllByText('—')[0]).toBeTruthy();
    });

    it('muestra el estado vacío sin recepciones', () => {
        renderPagina(RecepcionPage, { recepcionesDb: [], ordenesDb: [] });

        expect(screen.getByText('Sin recepciones registradas')).toBeTruthy();
        expect(
            screen.getByText('Registra un ingreso contra una Orden de Compra.'),
        ).toBeTruthy();
    });

    it('valida que se seleccione una orden de compra', () => {
        renderRecepcion();

        enviar();

        expect(llamadasHttp).toHaveLength(0);
        expect(
            screen.getByText('Selecciona la Orden de Compra a recepcionar.'),
        ).toBeTruthy();
    });

    it('carga los materiales de la OC y avisa del almacén destino', () => {
        renderRecepcion();

        seleccionarOrden('1');

        expect(screen.getAllByText('Cemento Portland')[0]).toBeTruthy();
        expect(screen.getAllByText('Material #2')[0]).toBeTruthy();
        expect(screen.getAllByText('Ordenado: 10 bol')[0]).toBeTruthy();
        expect(screen.getAllByText('Ordenado: 5 und')[0]).toBeTruthy();
        expect(
            screen.getAllByText(
                'Las existencias ingresarán al almacén destino de la orden (#1).',
            )[0],
        ).toBeTruthy();

        seleccionarOrden('2');
        expect(screen.queryByText('Ordenado: 10 bol')).toBeNull();
        expect(
            screen.queryByText(
                'Las existencias ingresarán al almacén destino de la orden (#1).',
            ),
        ).toBeNull();

        seleccionarOrden('');
        expect(screen.queryByText('Ordenado: 10 bol')).toBeNull();
    });

    it('exige que la orden tenga materiales', () => {
        renderRecepcion();

        seleccionarOrden('2');
        enviar();

        expect(llamadasHttp).toHaveLength(0);
        expect(
            screen.getByText(
                'La orden seleccionada no tiene materiales para recepcionar.',
            ),
        ).toBeTruthy();
    });

    it('registra la recepción con guía, cantidades y observaciones', () => {
        renderRecepcion();

        seleccionarOrden('1');

        const cantidades = screen.getAllByRole('spinbutton');
        fireEvent.change(cantidades[0], { target: { value: '8' } });
        fireEvent.change(cantidades[1], { target: { value: '' } });
        fireEvent.change(screen.getByPlaceholderText('GR-001-09823'), {
            target: { value: 'GR-2026-01' },
        });
        fireEvent.change(
            screen.getByPlaceholderText(
                'Anotaciones de la verificación física…',
            ),
            { target: { value: 'Ingreso parcial' } },
        );
        enviar();

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/recepciones',
                datos: expect.objectContaining({
                    almacen_id: '1',
                    orden_compra_id: '1',
                    guia_remision: 'GR-2026-01',
                    observaciones: 'Ingreso parcial',
                    detalles: [
                        {
                            orden_compra_detalle_id: 11,
                            material_id: 1,
                            cantidad_ordenada: 10,
                            cantidad_recibida: 8,
                        },
                        {
                            orden_compra_detalle_id: 12,
                            material_id: 2,
                            cantidad_ordenada: 5,
                            cantidad_recibida: 0,
                        },
                    ],
                }),
            }),
        );
        expect(router.reload).toHaveBeenCalledWith({
            only: ['recepcionesDb', 'ordenesDb'],
        });
        expect(
            screen.getByText(
                'Recepción registrada conforme y stock actualizado.',
            ),
        ).toBeTruthy();
        expect(screen.queryByText('Ordenado: 10 bol')).toBeNull();
    });
});
