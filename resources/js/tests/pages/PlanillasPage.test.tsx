import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import PlanillasPage from '../../pages/PlanillasPage';
import { formatMoneda } from '../../utils/format';
import { propsBase } from '../fixtures';
import { renderPagina } from '../harness';
import { llamadasHttp, router, setPageProps } from '../mocks/inertia';

const planillas = [
    {
        id: 1,
        periodo: '2026-01-Q1',
        estado: 'pagada',
        total: 12000,
        created_at: '2026-01-31T10:00:00.000Z',
        obra: { id: 1, nombre: 'Mejoramiento Vía Huancayo' },
        detalles: [
            { id: 1, dias_laborados: 22, horas_totales: 176, monto: 6000 },
            { id: 2, dias_laborados: 20, horas_totales: 160, monto: 6000 },
        ],
    },
    {
        id: 2,
        periodo: '2026-02-Q1',
        estado: 'procesada',
        total: null,
        created_at: '2026-02-28T10:00:00.000Z',
        obra: null,
        detalles: undefined,
    },
];

const moneda = (n: number) => formatMoneda(n).replace(/\u00a0/g, ' ');

describe('PlanillasPage', () => {
    beforeEach(() => {
        setPageProps(propsBase());
    });

    it('lista las planillas con obreros y días-hombre', () => {
        renderPagina(PlanillasPage, { planillasDb: planillas });

        expect(
            screen.getAllByText('Planillas de Pago y Jornales')[0],
        ).toBeTruthy();
        expect(screen.getByText('Planillas Generadas (2)')).toBeTruthy();
        expect(
            screen.getAllByText('Mejoramiento Vía Huancayo')[0],
        ).toBeTruthy();
        expect(screen.getAllByText('2026-01-Q1')[0]).toBeTruthy();
        expect(screen.getAllByText('42')[0]).toBeTruthy();
        expect(screen.getAllByText(moneda(12000))[0]).toBeTruthy();
        expect(screen.getAllByText('Pagada / Bancarizada')[0]).toBeTruthy();
        expect(screen.getAllByText('Procesada')[0]).toBeTruthy();
        expect(screen.getAllByText('—')[0]).toBeTruthy();
    });

    it('muestra el estado vacío', () => {
        renderPagina(PlanillasPage, { planillasDb: [] });

        expect(screen.getByText('Sin planillas generadas')).toBeTruthy();
        expect(screen.getByText('Planillas Generadas (0)')).toBeTruthy();
    });

    it('valida obra y periodo', () => {
        renderPagina(PlanillasPage, { planillasDb: planillas });

        const enviar = screen.getByRole('button', {
            name: /Generar y Procesar/,
        });

        fireEvent.change(screen.getByLabelText(/^Obra/), {
            target: { value: '' },
        });
        fireEvent.click(enviar);
        expect(screen.getByText('Selecciona la obra.')).toBeTruthy();

        fireEvent.change(screen.getByLabelText(/^Obra/), {
            target: { value: '1' },
        });
        fireEvent.click(enviar);
        expect(
            screen.getByText('Indica el periodo (p. ej. 2026-10-Q1).'),
        ).toBeTruthy();
        expect(llamadasHttp).toHaveLength(0);
    });

    it('genera la planilla del periodo indicado', () => {
        renderPagina(PlanillasPage, { planillasDb: planillas });

        fireEvent.change(screen.getByLabelText(/^Obra/), {
            target: { value: '1' },
        });
        fireEvent.change(screen.getByLabelText(/^Periodo/), {
            target: { value: '  2026-10-Q1  ' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /Generar y Procesar/ }),
        );

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/personal/planillas/generar',
                datos: { obra_id: 1, periodo: '2026-10-Q1' },
            }),
        );
        expect(screen.getByText('Planilla generada y procesada.')).toBeTruthy();
        expect(router.reload).toHaveBeenCalledWith({
            only: ['planillasDb'],
        });
    });
});
