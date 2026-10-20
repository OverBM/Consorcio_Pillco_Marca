import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import OrdenesCompraPage from '../../pages/OrdenesCompraPage';
import { propsBase } from '../fixtures';
import { renderPagina } from '../harness';
import { llamadasHttp, router, setPageProps } from '../mocks/inertia';

interface LineaTest {
    material_id: number;
    cantidad: number | string;
    precio_unitario: number | string;
    material?: { id: number; nombre: string } | null;
}

interface OrdenCompraTest {
    id: number;
    codigo: string;
    proveedor_id: number;
    requerimiento_id: number | null;
    obra_id: number;
    almacen_destino_id: number;
    urgente: boolean;
    estado: string;
    total: number | string;
    fecha_entrega_prometida: string | null;
    created_at: string;
    proveedor?: { id: number; ruc: string; razon_social: string } | null;
    almacen_destino?: { id: number; nombre: string } | null;
    detalles?: LineaTest[];
}

interface CotizacionTest {
    id: number;
    proveedor_id: number;
    requerimiento_id: number;
    total: number | string;
    proveedor?: { id: number; ruc: string; razon_social: string } | null;
    requerimiento?: {
        id: number;
        codigo: string;
        obra_id: number;
        obra?: { id: number; nombre: string } | null;
    } | null;
    detalles?: LineaTest[];
}

const ordenes: OrdenCompraTest[] = [
    {
        id: 1,
        codigo: 'OC-001',
        proveedor_id: 1,
        requerimiento_id: 10,
        obra_id: 1,
        almacen_destino_id: 1,
        urgente: false,
        estado: 'emitida',
        total: 1500,
        fecha_entrega_prometida: '2026-02-01',
        created_at: '2026-01-10T08:00:00.000Z',
        proveedor: {
            id: 1,
            ruc: '20123456789',
            razon_social: 'Ferretería Andina SAC',
        },
        almacen_destino: { id: 1, nombre: 'Almacén Central' },
        detalles: [
            {
                material_id: 1,
                cantidad: 2,
                precio_unitario: 500,
                material: { id: 1, nombre: 'Cemento Portland' },
            },
        ],
    },
    {
        id: 2,
        codigo: 'OC-002',
        proveedor_id: 9,
        requerimiento_id: null,
        obra_id: 1,
        almacen_destino_id: 3,
        urgente: true,
        estado: 'recepcionada_total',
        total: 250,
        fecha_entrega_prometida: null,
        created_at: '2026-01-11T08:00:00.000Z',
        proveedor: null,
        almacen_destino: null,
        detalles: [],
    },
    {
        id: 3,
        codigo: 'OC-003',
        proveedor_id: 2,
        requerimiento_id: 12,
        obra_id: 1,
        almacen_destino_id: 2,
        urgente: false,
        estado: 'anulada',
        total: '0',
        fecha_entrega_prometida: null,
        created_at: '2026-01-12T08:00:00.000Z',
        proveedor: {
            id: 2,
            ruc: '20987654321',
            razon_social: 'Aceros del Centro EIRL',
        },
        almacen_destino: { id: 2, nombre: 'Almacén Frente 2' },
        detalles: [
            {
                material_id: 2,
                cantidad: 1,
                precio_unitario: 100,
                material: null,
            },
        ],
    },
];

const cotizaciones: CotizacionTest[] = [
    {
        id: 1,
        proveedor_id: 1,
        requerimiento_id: 10,
        total: 1000,
        proveedor: {
            id: 1,
            ruc: '20123456789',
            razon_social: 'Ferretería Andina SAC',
        },
        requerimiento: {
            id: 10,
            codigo: 'REQ-010',
            obra_id: 1,
            obra: { id: 1, nombre: 'Obra Sur' },
        },
        detalles: [
            {
                material_id: 1,
                cantidad: 2,
                precio_unitario: 500,
                material: { id: 1, nombre: 'Cemento Portland' },
            },
        ],
    },
    {
        id: 2,
        proveedor_id: 2,
        requerimiento_id: 20,
        total: 500,
        proveedor: null,
        requerimiento: null,
        detalles: [],
    },
];

function renderOrdenes(
    datos: {
        ordenesDb?: OrdenCompraTest[];
        cotizacionesDb?: CotizacionTest[];
    } = { ordenesDb: ordenes, cotizacionesDb: cotizaciones },
) {
    return renderPagina(OrdenesCompraPage, { ...datos });
}

describe('OrdenesCompraPage', () => {
    beforeEach(() => {
        setPageProps(propsBase());
    });

    it('lista las órdenes con proveedor, almacén y estado', () => {
        renderOrdenes();

        expect(screen.getAllByText('OC-001')[0]).toBeTruthy();
        expect(screen.getAllByText('Ferretería Andina SAC')[0]).toBeTruthy();
        expect(screen.getAllByText('RUC: 20123456789')[0]).toBeTruthy();
        expect(screen.getAllByText('Proveedor #9')[0]).toBeTruthy();
        expect(screen.getAllByText('RUC: —')[0]).toBeTruthy();
        expect(screen.getAllByText('Almacén Central')[0]).toBeTruthy();
        expect(screen.getAllByText('Almacén #3')[0]).toBeTruthy();
        expect(screen.getAllByText('Emitida')[0]).toBeTruthy();
        expect(screen.getAllByText('Recepcionada')[0]).toBeTruthy();
        expect(screen.getAllByText('Anulada')[0]).toBeTruthy();
        expect(screen.getAllByText('—')[0]).toBeTruthy();
    });

    it('muestra el estado vacío sin órdenes', () => {
        renderOrdenes({ ordenesDb: [], cotizacionesDb: cotizaciones });

        expect(screen.getByText('Sin órdenes de compra')).toBeTruthy();
        expect(screen.getByText('Órdenes de compra (0)')).toBeTruthy();
    });

    it('filtra por proveedor y por estado', () => {
        renderOrdenes();

        const buscador = screen.getByPlaceholderText(
            'Buscar por OC, RUC o proveedor…',
        );
        fireEvent.change(buscador, { target: { value: 'acero' } });
        expect(screen.queryByText('OC-001')).toBeNull();
        expect(screen.getAllByText('OC-003')[0]).toBeTruthy();

        fireEvent.change(buscador, { target: { value: '' } });
        fireEvent.change(screen.getByLabelText('Filtrar estado'), {
            target: { value: 'recepcionada_total' },
        });
        expect(screen.queryByText('OC-001')).toBeNull();
        expect(screen.getAllByText('OC-002')[0]).toBeTruthy();
    });

    it('abre el detalle de una orden y lo cierra', () => {
        renderOrdenes();

        fireEvent.click(screen.getAllByText('Ver detalle')[0]);
        expect(screen.getAllByText('Orden de Compra OC-001')[0]).toBeTruthy();
        expect(screen.getAllByText('Cemento Portland')[0]).toBeTruthy();
        expect(screen.getAllByText('TOTAL')[0]).toBeTruthy();

        fireEvent.click(screen.getByLabelText('Cerrar'));
        expect(screen.queryByText('Orden de Compra OC-001')).toBeNull();
    });

    it('muestra el detalle de una orden sin proveedor ni líneas', () => {
        renderOrdenes();

        fireEvent.click(screen.getAllByText('Ver detalle')[1]);
        expect(screen.getAllByText('Orden de Compra OC-002')[0]).toBeTruthy();
        expect(screen.getAllByText('#9')[0]).toBeTruthy();
        expect(screen.getAllByText('Almacén #3')[0]).toBeTruthy();
    });

    it('valida el formulario de emisión', () => {
        renderOrdenes();

        fireEvent.click(
            screen.getByRole('button', { name: /Emitir Orden de Compra/ }),
        );
        expect(llamadasHttp).toHaveLength(0);
        expect(
            screen.getAllByText('Selecciona la cotización adjudicada.')[0],
        ).toBeTruthy();

        fireEvent.change(screen.getByLabelText(/^Oferta adjudicada/), {
            target: { value: '2' },
        });
        fireEvent.change(screen.getByLabelText(/^Almacén de destino/), {
            target: { value: '1' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /Emitir Orden de Compra/ }),
        );
        expect(
            screen.getAllByText(
                'La cotización seleccionada no tiene detalle de materiales.',
            )[0],
        ).toBeTruthy();
        expect(llamadasHttp).toHaveLength(0);
    });

    it('emite una orden de compra desde la cotización adjudicada', () => {
        renderOrdenes();

        fireEvent.change(screen.getByLabelText(/^Oferta adjudicada/), {
            target: { value: '1' },
        });
        expect(screen.getAllByText('REQ-010')[0]).toBeTruthy();
        expect(
            screen.getAllByText('1 material(es) en el detalle')[0],
        ).toBeTruthy();

        fireEvent.change(screen.getByLabelText(/^Almacén de destino/), {
            target: { value: '1' },
        });
        fireEvent.change(screen.getByLabelText(/^Fecha de entrega prometida/), {
            target: { value: '2026-03-15' },
        });
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(
            screen.getByRole('button', { name: /Emitir Orden de Compra/ }),
        );

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/ordenes-compra',
                datos: expect.objectContaining({
                    cotizacion_id: 1,
                    requerimiento_id: 10,
                    proveedor_id: 1,
                    obra_id: 1,
                    almacen_destino_id: 1,
                    urgente: true,
                    fecha_entrega_prometida: '2026-03-15',
                    detalles: [
                        { material_id: 1, cantidad: 2, precio_unitario: 500 },
                    ],
                }),
            }),
        );
        expect(router.reload).toHaveBeenCalledWith({
            only: ['ordenesDb', 'cotizacionesDb'],
        });
    });
});
