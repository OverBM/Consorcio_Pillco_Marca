import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import DevolucionesPage from '../../pages/DevolucionesPage';
import { propsBase } from '../fixtures';
import { renderPagina } from '../harness';
import { llamadasHttp, router, setPageProps } from '../mocks/inertia';

const recepciones = [
    {
        id: 1,
        codigo: 'REC-001',
        almacen_id: 1,
        orden_compra_id: 1,
        almacen: { id: 1, nombre: 'Almacén Central' },
        orden_compra: {
            id: 1,
            codigo: 'OC-001',
            proveedor: { id: 1, razon_social: 'Ferretería Andina SAC' },
        },
        detalles: [
            {
                id: 1,
                material_id: 1,
                material: { id: 1, nombre: 'Cemento Portland' },
            },
            { id: 2, material_id: 2, material: null },
        ],
    },
    {
        id: 2,
        codigo: 'REC-002',
        almacen_id: 1,
        orden_compra_id: 5,
        orden_compra: null,
        detalles: [],
    },
];

const devoluciones = [
    {
        id: 1,
        codigo: 'DEV-001',
        recepcion_id: 1,
        proveedor_id: 1,
        motivo: 'Daño físico en sacos',
        estado: 'registrada',
        created_at: '2026-01-12T10:00:00.000Z',
        proveedor: { id: 1, razon_social: 'Ferretería Andina SAC' },
        recepcion: {
            id: 1,
            codigo: 'REC-001',
            almacen: { id: 1, nombre: 'Almacén Central' },
        },
        detalles: [
            {
                id: 1,
                material_id: 1,
                cantidad: 3,
                material: { id: 1, nombre: 'Cemento Portland' },
            },
            { id: 2, material_id: 2, cantidad: 2, material: null },
        ],
    },
    {
        id: 2,
        codigo: 'DEV-002',
        recepcion_id: 9,
        proveedor_id: 9,
        motivo: 'Humedad en almacén',
        estado: 'anulada',
        created_at: '2026-01-13T10:00:00.000Z',
        proveedor: null,
        recepcion: null,
        detalles: [],
    },
];

describe('DevolucionesPage', () => {
    beforeEach(() => {
        setPageProps(propsBase());
    });

    it('lista las actas con proveedor, recepción y materiales', () => {
        renderPagina(DevolucionesPage, {
            devolucionesDb: devoluciones,
            recepcionesDb: recepciones,
        });

        expect(
            screen.getAllByText('Devoluciones y Rechazos a Proveedor')[0],
        ).toBeTruthy();
        expect(screen.getByText('Devoluciones (2)')).toBeTruthy();
        expect(screen.getAllByText('DEV-001')[0]).toBeTruthy();
        expect(
            screen.getAllByText('Ferretería Andina SAC')[0],
        ).toBeTruthy();
        expect(screen.getAllByText('REC-001')[0]).toBeTruthy();
        expect(screen.getAllByText('Cemento Portland (+1)')[0]).toBeTruthy();
        expect(screen.getAllByText('Rechazo: 5')[0]).toBeTruthy();
        expect(screen.getAllByText('Registrada')[0]).toBeTruthy();
        expect(screen.getAllByText('Anulada')[0]).toBeTruthy();
        expect(screen.getAllByText('Proveedor #9')[0]).toBeTruthy();
        expect(screen.getAllByText('#9')[0]).toBeTruthy();
        expect(screen.getAllByText('—')[0]).toBeTruthy();
        expect(screen.getAllByText('Humedad en almacén')[0]).toBeTruthy();
    });

    it('muestra el estado vacío sin devoluciones', () => {
        renderPagina(DevolucionesPage, {
            devolucionesDb: [],
            recepcionesDb: recepciones,
        });

        expect(screen.getByText('Sin devoluciones registradas')).toBeTruthy();
        expect(screen.getByText('Devoluciones (0)')).toBeTruthy();
    });

    it('filtra por búsqueda y por estado', () => {
        renderPagina(DevolucionesPage, {
            devolucionesDb: devoluciones,
            recepcionesDb: recepciones,
        });

        const buscador = screen.getByPlaceholderText(
            'Buscar por codigo o proveedor…',
        );
        fireEvent.change(buscador, { target: { value: 'dev-002' } });
        expect(screen.queryAllByText('DEV-001')).toHaveLength(0);
        expect(screen.getAllByText('DEV-002')[0]).toBeTruthy();
        expect(screen.getByText('Devoluciones (1)')).toBeTruthy();

        fireEvent.change(buscador, { target: { value: 'acero' } });
        expect(
            screen.getByText(
                'No hay devoluciones que coincidan con la búsqueda.',
            ),
        ).toBeTruthy();

        fireEvent.change(buscador, { target: { value: '' } });
        fireEvent.change(screen.getByLabelText('Filtrar estado'), {
            target: { value: 'registrada' },
        });
        expect(screen.getAllByText('DEV-001')[0]).toBeTruthy();
        expect(screen.queryAllByText('DEV-002')).toHaveLength(0);
    });

    it('valida la recepción, el proveedor y el motivo', () => {
        renderPagina(DevolucionesPage, {
            devolucionesDb: devoluciones,
            recepcionesDb: recepciones,
        });

        const enviar = screen.getByRole('button', {
            name: /Emitir Acta de Rechazo/,
        });

        fireEvent.click(enviar);
        expect(
            screen.getByText('Selecciona la recepción de origen.'),
        ).toBeTruthy();

        fireEvent.change(screen.getByLabelText(/^Recepción/), {
            target: { value: '2' },
        });
        fireEvent.click(enviar);
        expect(
            screen.getByText(
                'La recepción seleccionada no tiene proveedor asociado.',
            ),
        ).toBeTruthy();

        fireEvent.change(screen.getByLabelText(/^Recepción/), {
            target: { value: '1' },
        });
        expect(
            (
                screen.getByLabelText(/^Proveedor/) as HTMLInputElement
            ).value,
        ).toBe('Ferretería Andina SAC');
        fireEvent.click(enviar);
        expect(
            screen.getByText('Describe el motivo de la no conformidad.'),
        ).toBeTruthy();

        fireEvent.change(screen.getByLabelText(/^Detalle de no conformidad/), {
            target: { value: 'Sacos rotos' },
        });
        fireEvent.click(enviar);
        expect(
            screen.getByText(
                'Agrega al menos un material con cantidad mayor a cero.',
            ),
        ).toBeTruthy();
        expect(llamadasHttp).toHaveLength(0);
    });

    it('agrega y quita líneas de material', () => {
        renderPagina(DevolucionesPage, {
            devolucionesDb: devoluciones,
            recepcionesDb: recepciones,
        });

        fireEvent.change(screen.getByLabelText(/^Recepción/), {
            target: { value: '1' },
        });
        expect(screen.getAllByLabelText('Material')).toHaveLength(1);

        fireEvent.click(screen.getByText('+ Añadir material'));
        expect(screen.getAllByLabelText('Material')).toHaveLength(2);

        fireEvent.click(screen.getAllByLabelText('Quitar material')[0]);
        expect(screen.getAllByLabelText('Material')).toHaveLength(1);
    });

    it('emite el acta con los materiales rechazados', () => {
        renderPagina(DevolucionesPage, {
            devolucionesDb: devoluciones,
            recepcionesDb: recepciones,
        });

        fireEvent.change(screen.getByLabelText(/^Recepción/), {
            target: { value: '1' },
        });
        fireEvent.change(screen.getAllByLabelText('Material')[0], {
            target: { value: '2' },
        });
        fireEvent.change(screen.getByLabelText('Cantidad rechazada'), {
            target: { value: '4' },
        });
        fireEvent.click(screen.getByText('+ Añadir material'));
        fireEvent.change(screen.getAllByLabelText('Material')[1], {
            target: { value: '1' },
        });
        fireEvent.change(screen.getAllByLabelText('Cantidad rechazada')[1], {
            target: { value: '1.5' },
        });
        fireEvent.change(screen.getByLabelText(/^Detalle de no conformidad/), {
            target: { value: 'Sacos rotos y humedad' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /Emitir Acta de Rechazo/ }),
        );

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/devoluciones',
                datos: {
                    recepcion_id: 1,
                    proveedor_id: 1,
                    motivo: 'Sacos rotos y humedad',
                    detalles: [
                        { material_id: 2, cantidad: 4 },
                        { material_id: 1, cantidad: 1.5 },
                    ],
                },
            }),
        );
        expect(
            screen.getByText('Devolución registrada y stock actualizado.'),
        ).toBeTruthy();
        expect(router.reload).toHaveBeenCalledWith({
            only: ['devolucionesDb'],
        });
    });
});
