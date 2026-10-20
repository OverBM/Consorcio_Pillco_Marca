import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import RequerimientosPage from '../../pages/RequerimientosPage';
import { propsBase } from '../fixtures';
import { renderPagina } from '../harness';
import { llamadasHttp, router, setPageProps } from '../mocks/inertia';

interface MaterialRefTest {
    id: number;
    nombre: string;
    unidad_medida?: { codigo: string } | null;
}

interface DetalleRequerimientoTest {
    id: number;
    material_id: number;
    cantidad: number | string;
    cantidad_atendida: number | string;
    material?: MaterialRefTest | null;
}

interface RequerimientoTest {
    id: number;
    codigo: string;
    obra_id: number;
    almacen_id: number;
    prioridad: string;
    estado: string;
    justificacion: string;
    fecha_requerida: string | null;
    motivo_rechazo?: string | null;
    created_at: string;
    obra?: { id: number; nombre: string } | null;
    almacen?: { id: number; nombre: string } | null;
    detalles?: DetalleRequerimientoTest[];
}

const requerimientos: RequerimientoTest[] = [
    {
        id: 1,
        codigo: 'REQ-001',
        obra_id: 1,
        almacen_id: 1,
        prioridad: 'urgente',
        estado: 'solicitado',
        justificacion: 'Reposición de stock crítico',
        fecha_requerida: '2026-02-01',
        motivo_rechazo: null,
        created_at: '2026-01-10T08:00:00.000Z',
        obra: { id: 1, nombre: 'Mejoramiento Vía Huancayo' },
        almacen: { id: 1, nombre: 'Almacén Central' },
        detalles: [
            {
                id: 11,
                material_id: 1,
                cantidad: 10,
                cantidad_atendida: 0,
                material: { id: 1, nombre: 'Cemento Portland' },
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
        codigo: 'REQ-002',
        obra_id: 5,
        almacen_id: 2,
        prioridad: 'normal',
        estado: 'aprobado',
        justificacion: 'Ampliación de frente',
        fecha_requerida: null,
        motivo_rechazo: null,
        created_at: '2026-01-11T08:00:00.000Z',
        obra: null,
        almacen: null,
        detalles: [],
    },
    {
        id: 3,
        codigo: 'REQ-003',
        obra_id: 1,
        almacen_id: 1,
        prioridad: 'alta',
        estado: 'rechazado',
        justificacion: 'Sobrante de obra norte',
        fecha_requerida: '2026-02-10',
        motivo_rechazo: 'Presupuesto insuficiente',
        created_at: '2026-01-12T08:00:00.000Z',
        obra: { id: 1, nombre: 'Obra Norte' },
        almacen: { id: 1, nombre: 'Almacén Central' },
        detalles: [
            {
                id: 31,
                material_id: 1,
                cantidad: 2,
                cantidad_atendida: 0,
                material: {
                    id: 1,
                    nombre: 'Cemento Portland',
                    unidad_medida: { codigo: 'bol' },
                },
            },
        ],
    },
];

function renderRequerimientos(datos: RequerimientoTest[] = requerimientos) {
    return renderPagina(RequerimientosPage, { requerimientosDb: datos });
}

describe('RequerimientosPage', () => {
    beforeEach(() => {
        setPageProps(propsBase());
    });

    it('lista los requerimientos con estado, prioridad e ítems', () => {
        renderRequerimientos();

        expect(screen.getAllByText('REQ-001')[0]).toBeTruthy();
        expect(screen.getAllByText('Solicitado')[0]).toBeTruthy();
        expect(screen.getAllByText('Aprobado')[0]).toBeTruthy();
        expect(screen.getAllByText('Rechazado')[0]).toBeTruthy();
        expect(screen.getAllByText('urgente')[0]).toBeTruthy();
        expect(screen.getAllByText('alta')[0]).toBeTruthy();
        expect(
            screen.getAllByText('Mejoramiento Vía Huancayo')[0],
        ).toBeTruthy();
        expect(screen.getAllByText('Obra #5')[0]).toBeTruthy();
        expect(screen.getAllByText('2 ítem(s)')[0]).toBeTruthy();
        expect(screen.getAllByText('Presupuesto insuficiente')[0]).toBeTruthy();
        expect(screen.getAllByText('—')[0]).toBeTruthy();
    });

    it('muestra el estado vacío y los indicadores en cero', () => {
        renderRequerimientos([]);

        expect(screen.getByText('Sin requerimientos registrados')).toBeTruthy();
        expect(screen.getByText('Requerimientos (0)')).toBeTruthy();
        expect(screen.getByText('Ítems solicitados')).toBeTruthy();
    });

    it('filtra por texto y por estado', () => {
        renderRequerimientos();

        const buscador = screen.getByPlaceholderText(
            'Buscar por código, obra o justificación…',
        );
        fireEvent.change(buscador, { target: { value: 'norte' } });
        expect(screen.queryByText('REQ-001')).toBeNull();
        expect(screen.getAllByText('REQ-003')[0]).toBeTruthy();

        fireEvent.change(buscador, { target: { value: '' } });
        fireEvent.change(screen.getByLabelText('Filtrar estado'), {
            target: { value: 'aprobado' },
        });
        expect(screen.queryByText('REQ-001')).toBeNull();
        expect(screen.getAllByText('REQ-002')[0]).toBeTruthy();

        fireEvent.change(screen.getByLabelText('Filtrar estado'), {
            target: { value: 'todos' },
        });
        expect(screen.getAllByText('REQ-001')[0]).toBeTruthy();
    });

    it('aprueba un requerimiento solicitado', () => {
        renderRequerimientos();

        fireEvent.click(screen.getAllByTitle('Aprobar requerimiento')[0]);

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/requerimientos/1/evaluar',
                datos: expect.objectContaining({ estado: 'aprobado' }),
            }),
        );
        expect(router.reload).toHaveBeenCalledWith({
            only: ['requerimientosDb'],
        });
    });

    it('rechaza un requerimiento validando el motivo', () => {
        renderRequerimientos();

        fireEvent.click(screen.getAllByTitle('Rechazar requerimiento')[0]);
        expect(screen.getAllByText('Rechazar REQ-001')[0]).toBeTruthy();

        fireEvent.click(screen.getAllByText('Confirmar rechazo')[0]);
        expect(llamadasHttp).toHaveLength(0);

        fireEvent.change(
            screen.getByPlaceholderText(
                'Explica por qué se rechaza el requerimiento…',
            ),
            { target: { value: 'Sin partida presupuestal' } },
        );
        fireEvent.click(screen.getAllByText('Confirmar rechazo')[0]);

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/requerimientos/1/evaluar',
                datos: expect.objectContaining({
                    estado: 'rechazado',
                    motivo_rechazo: 'Sin partida presupuestal',
                }),
            }),
        );
        expect(screen.queryByText('Rechazar REQ-001')).toBeNull();
    });

    it('cancela y cierra el modal de rechazo', () => {
        renderRequerimientos();

        fireEvent.click(screen.getAllByTitle('Rechazar requerimiento')[0]);
        fireEvent.click(screen.getAllByText('Cancelar')[0]);

        expect(screen.queryByText('Rechazar REQ-001')).toBeNull();
    });

    it('valida el formulario de registro paso a paso', () => {
        renderRequerimientos();

        fireEvent.click(screen.getAllByText('Generar Requerimiento')[0]);
        expect(llamadasHttp).toHaveLength(0);
        expect(
            screen.getAllByText('Selecciona la obra y el almacén.')[0],
        ).toBeTruthy();

        fireEvent.change(screen.getByLabelText(/^Obra /), {
            target: { value: '1' },
        });
        fireEvent.change(screen.getByLabelText(/^Almacén destino/), {
            target: { value: '1' },
        });
        fireEvent.click(screen.getAllByText('Generar Requerimiento')[0]);
        expect(
            screen.getAllByText(
                'Describe la justificación del requerimiento.',
            )[0],
        ).toBeTruthy();

        fireEvent.change(screen.getByLabelText(/^Sustento técnico/), {
            target: { value: 'Sustento técnico de obra' },
        });
        fireEvent.click(screen.getAllByText('Generar Requerimiento')[0]);
        expect(
            screen.getAllByText(
                'Agrega al menos un material con cantidad mayor a cero.',
            )[0],
        ).toBeTruthy();
        expect(llamadasHttp).toHaveLength(0);
    });

    it('registra un requerimiento con justificación y materiales', () => {
        renderRequerimientos();

        fireEvent.change(screen.getByLabelText(/^Obra /), {
            target: { value: '1' },
        });
        fireEvent.change(screen.getByLabelText(/^Almacén destino/), {
            target: { value: '1' },
        });
        fireEvent.change(screen.getByLabelText(/^Prioridad/), {
            target: { value: 'urgente' },
        });
        fireEvent.change(screen.getByLabelText(/^Requerido para/), {
            target: { value: '2026-03-01' },
        });
        fireEvent.change(screen.getByLabelText('Material'), {
            target: { value: '1' },
        });
        fireEvent.change(screen.getByLabelText('Cantidad'), {
            target: { value: '8' },
        });
        fireEvent.change(screen.getByLabelText(/^Sustento técnico/), {
            target: { value: 'Compra de cemento para vaciado' },
        });
        fireEvent.click(screen.getAllByText('Generar Requerimiento')[0]);

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/requerimientos',
                datos: expect.objectContaining({
                    obra_id: 1,
                    almacen_id: 1,
                    prioridad: 'urgente',
                    justificacion: 'Compra de cemento para vaciado',
                    fecha_requerida: '2026-03-01',
                    detalles: [{ material_id: 1, cantidad: 8 }],
                }),
            }),
        );
        expect(router.reload).toHaveBeenCalledWith({
            only: ['requerimientosDb'],
        });
    });

    it('añade y quita líneas de material', () => {
        renderRequerimientos();

        fireEvent.click(screen.getByText('+ Añadir material'));
        expect(screen.getAllByLabelText('Material')).toHaveLength(2);
        expect(screen.getAllByLabelText('Cantidad')).toHaveLength(2);

        fireEvent.click(screen.getAllByLabelText('Quitar material')[0]);
        expect(screen.getAllByLabelText('Material')).toHaveLength(1);
    });
});
