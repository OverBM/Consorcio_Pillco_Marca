import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import EppPage from '../../pages/EppPage';
import { catalogosFixture, propsBase } from '../fixtures';
import { renderPagina } from '../harness';
import { llamadasHttp, router, setPageProps } from '../mocks/inertia';

const trabajadores = [
    { id: 1, nombres: 'Juan Ramos', cargo: 'Operario', obra_id: 1 },
    { id: 2, nombres: 'María Soto', cargo: null, obra_id: 1 },
];

const asignaciones = [
    {
        id: 1,
        numero_serie: '3M-CSC-2026-0098',
        entregado_en: '2026-01-15T10:00:00.000Z',
        estado: 'vigente',
        trabajador: { id: 1, nombres: 'Juan Ramos', cargo: 'Operario' },
        material: {
            id: 1,
            nombre: 'Casco de seguridad',
            unidad: { codigo: 'UND' },
        },
        almacen: { id: 1, nombre: 'Almacén Central' },
    },
    {
        id: 2,
        numero_serie: null,
        entregado_en: '2026-01-16T10:00:00.000Z',
        estado: 'devuelto',
        trabajador: null,
        material: null,
        almacen: null,
    },
];

describe('EppPage', () => {
    beforeEach(() => {
        setPageProps(propsBase());
    });

    it('lista las asignaciones con trabajador, EPP y serie', () => {
        renderPagina(EppPage, {
            asignacionesDb: asignaciones,
            trabajadoresDb: trabajadores,
        });

        expect(
            screen.getAllByText('Uso y Control de EPP Serializado')[0],
        ).toBeTruthy();
        expect(screen.getByText('Asignaciones de EPP (2)')).toBeTruthy();
        expect(screen.getAllByText('Juan Ramos')[0]).toBeTruthy();
        expect(screen.getAllByText('Operario')[0]).toBeTruthy();
        expect(screen.getAllByText('Casco de seguridad')[0]).toBeTruthy();
        expect(screen.getAllByText('3M-CSC-2026-0098')[0]).toBeTruthy();
        expect(screen.getAllByText('S/N')[0]).toBeTruthy();
        expect(screen.getAllByText('Vigente')[0]).toBeTruthy();
        expect(screen.getAllByText('DEVUELTO')[0]).toBeTruthy();
        expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    });

    it('muestra el estado vacío sin asignaciones', () => {
        renderPagina(EppPage, {
            asignacionesDb: [],
            trabajadoresDb: trabajadores,
        });

        expect(screen.getByText('Sin asignaciones de EPP')).toBeTruthy();
        expect(screen.getByText('Asignaciones de EPP (0)')).toBeTruthy();
    });

    it('valida trabajador, almacén y equipo', () => {
        renderPagina(EppPage, {
            asignacionesDb: asignaciones,
            trabajadoresDb: trabajadores,
        });

        const enviar = screen.getByRole('button', {
            name: /Asignar y Descontar/,
        });

        fireEvent.click(enviar);
        expect(screen.getByText('Selecciona al trabajador.')).toBeTruthy();

        fireEvent.change(screen.getByLabelText(/^Trabajador/), {
            target: { value: '1' },
        });
        fireEvent.click(enviar);
        expect(
            screen.getByText('Selecciona el equipo de protección.'),
        ).toBeTruthy();
        expect(llamadasHttp).toHaveLength(0);
    });

    it('valida el almacén cuando no hay catálogo', () => {
        setPageProps({
            ...propsBase(),
            catalogos: { ...catalogosFixture, almacenes: [] },
        });
        renderPagina(EppPage, {
            asignacionesDb: asignaciones,
            trabajadoresDb: trabajadores,
        });

        fireEvent.change(screen.getByLabelText(/^Trabajador/), {
            target: { value: '1' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /Asignar y Descontar/ }),
        );

        expect(
            screen.getByText('Selecciona el almacén de despacho.'),
        ).toBeTruthy();
    });

    it('asigna el EPP con la serie recortada', () => {
        renderPagina(EppPage, {
            asignacionesDb: asignaciones,
            trabajadoresDb: trabajadores,
        });

        fireEvent.change(screen.getByLabelText(/^Trabajador/), {
            target: { value: '2' },
        });
        fireEvent.change(screen.getByLabelText(/^Equipo de Protección/), {
            target: { value: '2' },
        });
        fireEvent.change(screen.getByLabelText(/^N° de Serie/), {
            target: { value: '  SERIE-77  ' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /Asignar y Descontar/ }),
        );

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/sst/epp-asignaciones',
                datos: {
                    trabajador_id: 2,
                    almacen_id: 1,
                    material_id: 2,
                    numero_serie: 'SERIE-77',
                },
            }),
        );
        expect(
            screen.getByText('EPP asignado y descargado del inventario.'),
        ).toBeTruthy();
        expect(router.reload).toHaveBeenCalledWith({
            only: ['asignacionesDb'],
        });
    });

    it('asigna sin número de serie', () => {
        renderPagina(EppPage, {
            asignacionesDb: asignaciones,
            trabajadoresDb: trabajadores,
        });

        fireEvent.change(screen.getByLabelText(/^Trabajador/), {
            target: { value: '1' },
        });
        fireEvent.change(screen.getByLabelText(/^Equipo de Protección/), {
            target: { value: '1' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /Asignar y Descontar/ }),
        );

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                datos: expect.objectContaining({ numero_serie: null }),
            }),
        );
    });
});
