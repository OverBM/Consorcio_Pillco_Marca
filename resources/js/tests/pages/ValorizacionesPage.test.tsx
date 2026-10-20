import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import ValorizacionesPage from '../../pages/ValorizacionesPage';
import { formatFecha, formatMoneda } from '../../utils/format';
import { catalogosFixture, propsBase } from '../fixtures';
import { renderPagina } from '../harness';
import { llamadasHttp, router, setPageProps } from '../mocks/inertia';

const valorizaciones = [
    {
        id: 1,
        obra_id: 1,
        periodo: '2026-01-31',
        valor_planificado: 100000,
        valor_ganado: 90000,
        costo_real: 95000,
        estado: 'aprobada',
        obra: { id: 1, nombre: 'Mejoramiento Vía Huancayo' },
    },
    {
        id: 2,
        obra_id: 2,
        periodo: '2026-02-28',
        valor_planificado: '0',
        valor_ganado: 50000,
        costo_real: '0',
        estado: 'pendiente',
        obra: null,
    },
];

const moneda = (n: number) => formatMoneda(n).replace(/\u00a0/g, ' ');

describe('ValorizacionesPage', () => {
    beforeEach(() => {
        setPageProps(propsBase());
    });

    it('calcula SPI/CPI y lista las valorizaciones', () => {
        renderPagina(ValorizacionesPage, {
            valorizacionesDb: valorizaciones,
        });

        expect(
            screen.getAllByText('Costos y Valorizaciones Mensuales')[0],
        ).toBeTruthy();
        expect(screen.getByText('Valorizaciones (2)')).toBeTruthy();
        expect(screen.getAllByText(formatFecha('2026-01-31'))[0]).toBeTruthy();
        expect(screen.getAllByText(moneda(90000))[0]).toBeTruthy();
        expect(screen.getAllByText('0.947')[0]).toBeTruthy();
        expect(screen.getAllByText('0.900')[0]).toBeTruthy();
        expect(screen.getAllByText('0.000').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Aprobada').length).toBeGreaterThan(0);
        expect(screen.getAllByText('pendiente')[0]).toBeTruthy();
        expect(screen.getAllByText('Aprobar')[0]).toBeTruthy();
    });

    it('filtra por obra y muestra el vacío', () => {
        setPageProps({
            ...propsBase(),
            catalogos: {
                ...catalogosFixture,
                obras: [
                    catalogosFixture.obras[0],
                    {
                        id: 2,
                        codigo: 'OB-02',
                        nombre: 'Ampliación Puente',
                        distrito: null,
                        estado: 'activa',
                        avance_fisico_pct: 10,
                    },
                ],
            },
        });
        renderPagina(ValorizacionesPage, {
            valorizacionesDb: valorizaciones,
        });

        fireEvent.change(screen.getAllByRole('combobox')[0], {
            target: { value: '2' },
        });

        expect(screen.getByText('Valorizaciones (1)')).toBeTruthy();
        expect(screen.queryAllByText(formatFecha('2026-01-31'))).toHaveLength(
            0,
        );
        expect(screen.getAllByText(formatFecha('2026-02-28'))[0]).toBeTruthy();
    });

    it('muestra el estado vacío', () => {
        renderPagina(ValorizacionesPage, { valorizacionesDb: [] });

        expect(screen.getByText('Sin valorizaciones')).toBeTruthy();
        expect(screen.getByText('Valorizaciones (0)')).toBeTruthy();
    });

    it('valida obra y periodo', () => {
        renderPagina(ValorizacionesPage, {
            valorizacionesDb: valorizaciones,
        });

        fireEvent.click(
            screen.getByRole('button', { name: /Registrar Valorización/ }),
        );

        expect(
            screen.getByText('Selecciona la obra y el periodo.'),
        ).toBeTruthy();
        expect(llamadasHttp).toHaveLength(0);
    });

    it('registra la valorización con valores numéricos', () => {
        renderPagina(ValorizacionesPage, {
            valorizacionesDb: valorizaciones,
        });

        fireEvent.change(screen.getByLabelText(/^Obra/), {
            target: { value: '1' },
        });
        fireEvent.change(screen.getByLabelText(/^Periodo \(fecha de corte\)/), {
            target: { value: '2026-03-31' },
        });
        fireEvent.change(screen.getByLabelText(/^Valor Planificado/), {
            target: { value: '100000' },
        });
        fireEvent.change(screen.getByLabelText(/^Valor Ganado/), {
            target: { value: '120000' },
        });
        fireEvent.change(screen.getByLabelText(/^Costo Real/), {
            target: { value: '110000' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /Registrar Valorización/ }),
        );

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/valorizaciones',
                datos: {
                    obra_id: 1,
                    periodo: '2026-03-31',
                    valor_planificado: 100000,
                    valor_ganado: 120000,
                    costo_real: 110000,
                },
            }),
        );
        expect(
            screen.getByText('Valorización mensual registrada.'),
        ).toBeTruthy();
        expect(router.reload).toHaveBeenCalledWith({
            only: ['valorizacionesDb'],
        });
    });

    it('aprueba una valorización pendiente', () => {
        renderPagina(ValorizacionesPage, {
            valorizacionesDb: valorizaciones,
        });

        fireEvent.click(screen.getAllByRole('button', { name: /Aprobar/ })[0]);

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/valorizaciones/2/aprobar',
            }),
        );
        expect(screen.getByText('Valorización aprobada.')).toBeTruthy();
        expect(router.reload).toHaveBeenCalledWith({
            only: ['valorizacionesDb'],
        });
    });
});
