import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import SolicitudesPage from '../../pages/SolicitudesPage';
import { propsBase } from '../fixtures';
import { renderPagina } from '../harness';
import { llamadasHttp, router, setPageProps } from '../mocks/inertia';

interface DetalleSolicitudTest {
    id: number;
    material_id: number;
    cantidad: number | string;
    cantidad_atendida: number | string;
    material?: {
        id: number;
        nombre: string;
        unidad_medida?: { codigo: string } | null;
    } | null;
}

interface SolicitudTest {
    id: number;
    codigo: string;
    obra_id: number;
    almacen_id: number;
    estado: string;
    urgente: boolean;
    created_at: string;
    atendida_en: string | null;
    obra?: { id: number; nombre: string } | null;
    detalles?: DetalleSolicitudTest[];
}

const solicitudes: SolicitudTest[] = [
    {
        id: 1,
        codigo: 'SOL-001',
        obra_id: 1,
        almacen_id: 2,
        estado: 'registrada',
        urgente: true,
        created_at: '2026-01-10T08:00:00.000Z',
        atendida_en: null,
        obra: { id: 1, nombre: 'Obra Sur' },
        detalles: [
            {
                id: 11,
                material_id: 1,
                cantidad: 10,
                cantidad_atendida: 0,
                material: {
                    id: 1,
                    nombre: 'Cemento Portland',
                    unidad_medida: { codigo: 'bol' },
                },
            },
            {
                id: 12,
                material_id: 2,
                cantidad: 5,
                cantidad_atendida: 0,
                material: null,
            },
        ],
    },
    {
        id: 2,
        codigo: 'SOL-002',
        obra_id: 7,
        almacen_id: 3,
        estado: 'atendida',
        urgente: false,
        created_at: '2026-01-11T08:00:00.000Z',
        atendida_en: '2026-01-12T08:00:00.000Z',
        obra: null,
        detalles: [],
    },
    {
        id: 3,
        codigo: 'SOL-003',
        obra_id: 1,
        almacen_id: 2,
        estado: 'anulada',
        urgente: false,
        created_at: '2026-01-13T08:00:00.000Z',
        atendida_en: null,
        obra: { id: 1, nombre: 'Obra Sur' },
        detalles: [
            {
                id: 31,
                material_id: 3,
                cantidad: 2,
                cantidad_atendida: 0,
                material: null,
            },
        ],
    },
];

function renderSolicitudes(datos: SolicitudTest[] = solicitudes) {
    return renderPagina(SolicitudesPage, { solicitudesDb: datos });
}

describe('SolicitudesPage', () => {
    beforeEach(() => {
        setPageProps(propsBase());
    });

    it('lista las solicitudes con urgencia, material y estado', () => {
        renderSolicitudes();

        expect(screen.getAllByText('SOL-001')[0]).toBeTruthy();
        expect(screen.getAllByText('URGENTE')[0]).toBeTruthy();
        expect(screen.getAllByText('Normal')[0]).toBeTruthy();
        expect(screen.getAllByText('Registrada')[0]).toBeTruthy();
        expect(screen.getAllByText('Atendida')[0]).toBeTruthy();
        expect(screen.getAllByText('Anulada')[0]).toBeTruthy();
        expect(screen.getAllByText('Cemento Portland (+1)')[0]).toBeTruthy();
        expect(screen.getAllByText('Material #3')[0]).toBeTruthy();
        expect(screen.getAllByText('Obra #7')[0]).toBeTruthy();
        expect(screen.getAllByText('Almacén #3')[0]).toBeTruthy();
        expect(screen.getAllByText('—')[0]).toBeTruthy();
    });

    it('muestra el estado vacío sin solicitudes', () => {
        renderSolicitudes([]);

        expect(screen.getByText('Sin solicitudes registradas')).toBeTruthy();
        expect(screen.getByText('Solicitudes (0)')).toBeTruthy();
    });

    it('valida el formulario de nueva solicitud', () => {
        renderSolicitudes();

        fireEvent.click(screen.getAllByText('Generar Solicitud')[0]);
        expect(llamadasHttp).toHaveLength(0);
        expect(
            screen.getAllByText(
                'Selecciona la obra y el almacén que atenderá la solicitud.',
            )[0],
        ).toBeTruthy();

        fireEvent.change(screen.getByLabelText(/^Obra solicitante/), {
            target: { value: '1' },
        });
        fireEvent.change(screen.getByLabelText(/^Almacén que atenderá/), {
            target: { value: '1' },
        });
        fireEvent.click(screen.getAllByText('Generar Solicitud')[0]);
        expect(
            screen.getAllByText(
                'Agrega al menos un material con cantidad mayor a cero.',
            )[0],
        ).toBeTruthy();
        expect(llamadasHttp).toHaveLength(0);
    });

    it('registra una solicitud urgente con su material', () => {
        renderSolicitudes();

        fireEvent.change(screen.getByLabelText(/^Obra solicitante/), {
            target: { value: '1' },
        });
        fireEvent.change(screen.getByLabelText(/^Almacén que atenderá/), {
            target: { value: '1' },
        });
        fireEvent.change(screen.getByLabelText('Material'), {
            target: { value: '1' },
        });
        fireEvent.change(screen.getAllByPlaceholderText('Cant.')[0], {
            target: { value: '4' },
        });
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getAllByText('Generar Solicitud')[0]);

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/solicitudes',
                datos: expect.objectContaining({
                    obra_id: 1,
                    almacen_id: 1,
                    urgente: true,
                    detalles: [{ material_id: 1, cantidad: 4 }],
                }),
            }),
        );
        expect(router.reload).toHaveBeenCalledWith({
            only: ['solicitudesDb'],
        });
    });

    it('añade y quita líneas de material', () => {
        renderSolicitudes();

        fireEvent.click(screen.getByText('+ Añadir material'));
        expect(screen.getAllByLabelText('Material')).toHaveLength(2);
        fireEvent.click(screen.getAllByLabelText('Quitar material')[0]);
        expect(screen.getAllByLabelText('Material')).toHaveLength(1);
    });

    it('atiende una solicitud registrada desde el modal', () => {
        renderSolicitudes();

        fireEvent.click(screen.getAllByText('Atender')[0]);
        expect(screen.getAllByText('Atender Solicitud')[0]).toBeTruthy();

        fireEvent.click(screen.getAllByText('Cancelar')[0]);
        expect(screen.queryByText('Atender Solicitud')).toBeNull();

        fireEvent.click(screen.getAllByText('Atender')[0]);
        fireEvent.click(screen.getAllByText('Confirmar Atención')[0]);

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/solicitudes/1/atender',
            }),
        );
        expect(router.reload).toHaveBeenCalledWith({
            only: ['solicitudesDb'],
        });
    });
});
