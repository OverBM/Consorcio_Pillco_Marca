import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import CambiosPage from '../../pages/CambiosPage';
import { formatFecha, formatMoneda } from '../../utils/format';
import { propsBase } from '../fixtures';
import { renderPagina } from '../harness';
import { llamadasHttp, router, setPageProps } from '../mocks/inertia';

const moneda = (n: number) => formatMoneda(n).replace(/\u00a0/g, ' ');

const cambios = [
    {
        id: 1,
        obra_id: 1,
        tipo: 'alcance',
        descripcion: 'Ampliación de losa',
        impacto_plazo_dias: 5,
        impacto_costo: 15000,
        estado: 'solicitada',
        created_at: '2026-02-01T10:00:00.000Z',
        obra: { id: 1, nombre: 'Mejoramiento Vía Huancayo' },
    },
    {
        id: 2,
        obra_id: 1,
        tipo: 'costo',
        descripcion: 'Mayor metrado de acero',
        impacto_plazo_dias: 0,
        impacto_costo: '25000',
        estado: 'aprobada',
        created_at: '2026-02-02T10:00:00.000Z',
        obra: null,
    },
    {
        id: 3,
        obra_id: 1,
        tipo: 'plazo',
        descripcion: 'Ampliación de plazo',
        impacto_plazo_dias: 10,
        impacto_costo: 0,
        estado: 'rechazada',
        created_at: '2026-02-03T10:00:00.000Z',
        obra: null,
    },
];

describe('CambiosPage', () => {
    beforeEach(() => {
        setPageProps(propsBase());
    });

    it('resume los indicadores y lista las solicitudes', () => {
        renderPagina(CambiosPage, { cambiosDb: cambios });

        expect(
            screen.getAllByText('Control Integrado de Cambios')[0],
        ).toBeTruthy();
        expect(
            screen.getByText('Solicitudes Pendientes').closest('div')
                ?.textContent,
        ).toContain('1');
        expect(
            screen.getByText('Cambios Aprobados').closest('div')?.textContent,
        ).toContain('1');
        expect(screen.getAllByText(moneda(25000))[0]).toBeTruthy();
        expect(screen.getByText('Solicitudes de Cambio (3)')).toBeTruthy();
        expect(
            screen.getAllByText(formatFecha('2026-02-01T10:00:00.000Z'))[0],
        ).toBeTruthy();
        expect(screen.getAllByText('alcance')[0]).toBeTruthy();
        expect(screen.getAllByText('Ampliación de losa')[0]).toBeTruthy();
        expect(screen.getAllByText('+5 días')[0]).toBeTruthy();
        expect(screen.getAllByText('0 días')[0]).toBeTruthy();
        expect(screen.getAllByText('+10 días')[0]).toBeTruthy();
        expect(screen.getAllByText('solicitada')[0]).toBeTruthy();
        expect(screen.getAllByText('aprobada')[0]).toBeTruthy();
        expect(screen.getAllByText('rechazada')[0]).toBeTruthy();
        expect(screen.getAllByText('Aprobar')[0]).toBeTruthy();
        expect(screen.getAllByText('Rechazar')[0]).toBeTruthy();
        expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    });

    it('muestra el estado vacío', () => {
        renderPagina(CambiosPage, { cambiosDb: [] });

        expect(screen.getByText('Sin solicitudes de cambio')).toBeTruthy();
        expect(screen.getByText('Solicitudes de Cambio (0)')).toBeTruthy();
    });

    it('valida obra y descripción', () => {
        renderPagina(CambiosPage, { cambiosDb: cambios });

        fireEvent.click(
            screen.getByRole('button', { name: /Registrar Solicitud/ }),
        );

        expect(
            screen.getByText('Selecciona la obra y describe el cambio.'),
        ).toBeTruthy();
        expect(llamadasHttp).toHaveLength(0);
    });

    it('registra la solicitud con impactos numéricos', () => {
        renderPagina(CambiosPage, { cambiosDb: cambios });

        fireEvent.change(screen.getByLabelText(/^Obra/), {
            target: { value: '1' },
        });
        fireEvent.change(screen.getByLabelText(/^Tipo de Cambio/), {
            target: { value: 'plazo' },
        });
        fireEvent.change(screen.getByLabelText(/^Descripción/), {
            target: { value: '  Ampliación de plazo  ' },
        });
        fireEvent.change(screen.getByLabelText(/^Plazo \(días\)/), {
            target: { value: '7' },
        });
        fireEvent.change(screen.getByLabelText(/^Costo \(S\/\)/), {
            target: { value: '1000.5' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /Registrar Solicitud/ }),
        );

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/solicitudes-cambio',
                datos: {
                    obra_id: 1,
                    tipo: 'plazo',
                    descripcion: '  Ampliación de plazo  ',
                    impacto_plazo_dias: 7,
                    impacto_costo: 1000.5,
                },
            }),
        );
        expect(
            screen.getByText('Solicitud de cambio registrada.'),
        ).toBeTruthy();
        expect(router.reload).toHaveBeenCalledWith({ only: ['cambiosDb'] });
    });

    it('aprueba y rechaza solicitudes pendientes', () => {
        renderPagina(CambiosPage, { cambiosDb: cambios });

        fireEvent.click(screen.getAllByRole('button', { name: /Aprobar/ })[0]);
        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/solicitudes-cambio/1/evaluar',
                datos: { estado: 'aprobada' },
            }),
        );
        expect(screen.getByText('Cambio aprobado.')).toBeTruthy();

        fireEvent.click(screen.getAllByRole('button', { name: /Rechazar/ })[0]);
        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/solicitudes-cambio/1/evaluar',
                datos: { estado: 'rechazada' },
            }),
        );
        expect(screen.getByText('Cambio rechazado.')).toBeTruthy();
    });
});
