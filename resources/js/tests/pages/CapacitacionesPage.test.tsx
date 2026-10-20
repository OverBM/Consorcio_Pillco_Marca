import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import CapacitacionesPage from '../../pages/CapacitacionesPage';
import { formatFecha } from '../../utils/format';
import { propsBase } from '../fixtures';
import { renderPagina } from '../harness';
import { llamadasHttp, router, setPageProps } from '../mocks/inertia';

const capacitaciones = [
    {
        id: 1,
        tipo: 'sst',
        titulo: 'Trabajos en Altura',
        fecha_programada: '2026-02-10',
        instructor: 'Ing. Pérez',
        nota_minima: 14,
        estado: 'programada',
        obra: { id: 1, nombre: 'Mejoramiento Vía Huancayo' },
    },
    {
        id: 2,
        tipo: 'induccion',
        titulo: 'Inducción General',
        fecha_programada: '2026-01-05',
        instructor: null,
        nota_minima: null,
        estado: 'ejecutada',
        obra: null,
    },
];

describe('CapacitacionesPage', () => {
    beforeEach(() => {
        setPageProps(propsBase());
    });

    it('lista las capacitaciones programadas', () => {
        renderPagina(CapacitacionesPage, {
            capacitacionesDb: capacitaciones,
        });

        expect(
            screen.getAllByText('Capacitación y Habilitación de Personal')[0],
        ).toBeTruthy();
        expect(screen.getByText('Capacitaciones (2)')).toBeTruthy();
        expect(screen.getAllByText('Trabajos en Altura')[0]).toBeTruthy();
        expect(screen.getAllByText('SST')[0]).toBeTruthy();
        expect(screen.getAllByText('INDUCCION')[0]).toBeTruthy();
        expect(
            screen.getAllByText('Mejoramiento Vía Huancayo')[0],
        ).toBeTruthy();
        expect(screen.getAllByText('Todas')[0]).toBeTruthy();
        expect(screen.getAllByText(formatFecha('2026-02-10'))[0]).toBeTruthy();
        expect(screen.getAllByText('Ing. Pérez')[0]).toBeTruthy();
        expect(screen.getAllByText('—').length).toBeGreaterThan(0);
        expect(screen.getAllByText('PROGRAMADA')[0]).toBeTruthy();
        expect(screen.getAllByText('EJECUTADA')[0]).toBeTruthy();
    });

    it('muestra el estado vacío', () => {
        renderPagina(CapacitacionesPage, { capacitacionesDb: [] });

        expect(
            screen.getByText('Sin capacitaciones programadas'),
        ).toBeTruthy();
        expect(screen.getByText('Capacitaciones (0)')).toBeTruthy();
    });

    it('valida tema y fecha programada', () => {
        renderPagina(CapacitacionesPage, { capacitacionesDb: capacitaciones });

        const enviar = screen.getByRole('button', {
            name: /Programar Capacitación/,
        });

        fireEvent.click(enviar);
        expect(
            screen.getByText('Ingresa el tema de capacitación.'),
        ).toBeTruthy();

        fireEvent.change(screen.getByLabelText(/^Tema/), {
            target: { value: 'Uso de Arnés' },
        });
        fireEvent.click(enviar);
        expect(screen.getByText('Indica la fecha programada.')).toBeTruthy();
        expect(llamadasHttp).toHaveLength(0);
    });

    it('programa una capacitación con tipos numéricos', () => {
        renderPagina(CapacitacionesPage, { capacitacionesDb: capacitaciones });

        fireEvent.change(screen.getByLabelText(/^Tema/), {
            target: { value: '  Uso de Arnés  ' },
        });
        fireEvent.change(screen.getByLabelText(/^Tipo/), {
            target: { value: 'calidad' },
        });
        fireEvent.change(screen.getByLabelText(/^Obra/), {
            target: { value: '1' },
        });
        fireEvent.change(screen.getByLabelText(/^Fecha Programada/), {
            target: { value: '2026-03-01' },
        });
        fireEvent.change(screen.getByLabelText(/^Instructor/), {
            target: { value: '  Ing. Soto ' },
        });
        fireEvent.change(screen.getByLabelText(/^Nota Mínima/), {
            target: { value: '15.5' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /Programar Capacitación/ }),
        );

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/sst/capacitaciones',
                datos: {
                    tipo: 'calidad',
                    titulo: 'Uso de Arnés',
                    obra_id: 1,
                    fecha_programada: '2026-03-01',
                    instructor: 'Ing. Soto',
                    nota_minima: 15.5,
                },
            }),
        );
        expect(
            screen.getByText('Capacitación SST programada.'),
        ).toBeTruthy();
        expect(router.reload).toHaveBeenCalledWith({
            only: ['capacitacionesDb'],
        });
    });

    it('programa sin obra, instructor ni nota mínima', () => {
        renderPagina(CapacitacionesPage, { capacitacionesDb: [] });

        fireEvent.change(screen.getByLabelText(/^Tema/), {
            target: { value: 'Inducción' },
        });
        fireEvent.change(screen.getByLabelText(/^Fecha Programada/), {
            target: { value: '2026-04-01' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /Programar Capacitación/ }),
        );

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                datos: {
                    tipo: 'sst',
                    titulo: 'Inducción',
                    obra_id: null,
                    fecha_programada: '2026-04-01',
                    instructor: null,
                    nota_minima: null,
                },
            }),
        );
    });
});
