import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import TransferenciasPage from '../../pages/TransferenciasPage';
import { propsBase } from '../fixtures';
import { renderPagina } from '../harness';
import { llamadasHttp, setPageProps } from '../mocks/inertia';

// `DataTable` duplica el contenido (tabla de escritorio + tarjetas móviles),
// por eso se consulta con `getAllBy*` y se toma el primer nodo.

const transferencias = [
    {
        id: 1,
        codigo: 'TR-001',
        motivo: 'Rebalance de stock',
        estado: 'solicitada',
        generada_automaticamente: false,
        distancia_m: 1200,
        eta_min: 30,
        created_at: '2026-01-10T08:00:00.000Z',
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
                cantidad_recibida: null,
                material: {
                    id: 1,
                    nombre: 'Cemento Portland',
                    unidad_medida: { codigo: 'bol' },
                },
            },
        ],
    },
    {
        id: 2,
        codigo: 'TR-002',
        motivo: 'Traslado urgente',
        estado: 'en_transito',
        generada_automaticamente: true,
        distancia_m: null,
        eta_min: null,
        created_at: '2026-01-11T08:00:00.000Z',
        almacen_origen_id: 1,
        almacen_destino_id: 2,
        almacen_origen: null,
        almacen_destino: null,
        detalles: [
            {
                id: 21,
                material_id: 2,
                cantidad_solicitada: 5,
                cantidad_despachada: 5,
                cantidad_recibida: null,
                material: null,
            },
        ],
    },
    {
        id: 3,
        codigo: 'TR-003',
        motivo: 'Reposición',
        estado: 'completada',
        generada_automaticamente: false,
        distancia_m: 900,
        eta_min: 20,
        created_at: '2026-01-12T08:00:00.000Z',
        almacen_origen_id: 2,
        almacen_destino_id: 1,
        almacen_origen: { id: 2, nombre: 'Almacén Frente 2' },
        almacen_destino: { id: 1, nombre: 'Almacén Central' },
        detalles: [],
    },
    {
        id: 4,
        codigo: 'TR-004',
        motivo: 'Aprobada sin despacho',
        estado: 'aprobada',
        generada_automaticamente: false,
        distancia_m: 400,
        eta_min: 10,
        created_at: '2026-01-13T08:00:00.000Z',
        almacen_origen_id: 1,
        almacen_destino_id: 2,
        almacen_origen: { id: 1, nombre: 'Almacén Central' },
        almacen_destino: { id: 2, nombre: 'Almacén Frente 2' },
        detalles: [],
    },
];

function renderTransferencias() {
    return renderPagina(TransferenciasPage, {
        transferenciasDb: transferencias,
    });
}

describe('TransferenciasPage', () => {
    beforeEach(() => {
        setPageProps(propsBase());
    });

    it('lista las órdenes con sus estados y leyendas', () => {
        renderTransferencias();

        expect(screen.getAllByText('TR-001')[0]).toBeTruthy();
        expect(screen.getAllByText('Solicitada')[0]).toBeTruthy();
        expect(screen.getAllByText('En tránsito')[0]).toBeTruthy();
        expect(screen.getAllByText('Automática')[0]).toBeTruthy();
        expect(screen.getAllByText('—')[0]).toBeTruthy();
        expect(screen.getAllByText('Pendiente de despacho')[0]).toBeTruthy();
        expect(screen.getAllByText('Material #2')[0]).toBeTruthy();
    });

    it('filtra por texto y por estado', () => {
        renderTransferencias();

        const buscador = screen.getByPlaceholderText(
            'Buscar código, motivo o material…',
        );
        fireEvent.change(buscador, { target: { value: 'rebalance' } });
        expect(screen.queryByText('TR-002')).toBeNull();

        fireEvent.change(buscador, { target: { value: '' } });
        fireEvent.change(screen.getByLabelText('Filtrar estado'), {
            target: { value: 'en_transito' },
        });
        expect(screen.queryByText('TR-001')).toBeNull();
        expect(screen.getAllByText('TR-002')[0]).toBeTruthy();
    });

    it('autoriza una orden solicitada', () => {
        renderTransferencias();

        fireEvent.click(screen.getAllByTitle('Autorizar orden (Logística)')[0]);

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/transferencias/1/aprobar',
            }),
        );
    });

    it('registra una nueva orden validando el formulario', () => {
        renderTransferencias();

        fireEvent.click(screen.getAllByText('Generar Orden')[0]);
        expect(llamadasHttp).toHaveLength(0);

        const selects = screen.getAllByRole('combobox');
        fireEvent.change(selects[1], { target: { value: '1' } });
        fireEvent.change(selects[2], { target: { value: '2' } });
        fireEvent.change(screen.getByLabelText('Material'), {
            target: { value: '1' },
        });
        fireEvent.change(screen.getByLabelText('Cantidad solicitada'), {
            target: { value: '8' },
        });
        fireEvent.change(screen.getByPlaceholderText('Rebalance de stock'), {
            target: { value: 'Traslado de prueba' },
        });
        fireEvent.click(screen.getAllByText('Generar Orden')[0]);

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/transferencias',
                datos: expect.objectContaining({
                    motivo: 'Traslado de prueba',
                }),
            }),
        );
    });

    it('añade y quita líneas de material y confirma la recepción', () => {
        renderTransferencias();

        fireEvent.click(screen.getByText('+ Añadir material'));
        expect(screen.getAllByLabelText('Material')).toHaveLength(2);
        fireEvent.click(screen.getAllByLabelText('Quitar material')[0]);
        expect(screen.getAllByLabelText('Material')).toHaveLength(1);

        fireEvent.click(
            screen.getAllByTitle('Confirmar recepción física en destino')[0],
        );
        expect(
            screen.getAllByText('Confirmar Recepción — TR-002')[0],
        ).toBeTruthy();

        fireEvent.change(
            screen.getByLabelText('Cantidad recibida de Material #2'),
            { target: { value: '3' } },
        );
        expect(
            screen.getAllByText(/Hay diferencias respecto a lo despachado/)[0],
        ).toBeTruthy();

        fireEvent.click(screen.getAllByText('Confirmar Recepción')[0]);

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/transferencias/2/confirmar-recepcion',
                datos: expect.objectContaining({ hay_diferencias: true }),
            }),
        );
    });
});
