import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import CalidadPage from '../../pages/CalidadPage';
import { formatFecha } from '../../utils/format';
import { propsBase } from '../fixtures';
import { renderPagina } from '../harness';
import { llamadasHttp, router, setPageProps } from '../mocks/inertia';

const observaciones = [
    {
        id: 1,
        numero_acta: 'ACTA-SUP-015',
        descripcion: 'Falta encofrado en losa',
        origen: 'supervision',
        plazo_subsanacion: '2026-02-15',
        estado: 'notificada',
        planos_asbuilt_actualizados: false,
        obra: { id: 1, nombre: 'Mejoramiento Vía Huancayo' },
        responsable: { id: 1, name: 'Ana Torres' },
    },
    {
        id: 2,
        numero_acta: null,
        descripcion: 'Juntas sin sello',
        origen: 'control_interno',
        plazo_subsanacion: null,
        estado: 'levantada',
        planos_asbuilt_actualizados: true,
        obra: null,
        responsable: null,
    },
];

describe('CalidadPage', () => {
    beforeEach(() => {
        setPageProps(propsBase());
    });

    it('lista las observaciones con su estado y as-built', () => {
        renderPagina(CalidadPage, { observacionesDb: observaciones });

        expect(
            screen.getAllByText('Observaciones Técnicas y Control de Calidad')[0],
        ).toBeTruthy();
        expect(screen.getByText('Observaciones (2)')).toBeTruthy();
        expect(screen.getAllByText('ACTA-SUP-015')[0]).toBeTruthy();
        expect(screen.getAllByText('SUPERVISION')[0]).toBeTruthy();
        expect(screen.getAllByText('CONTROL_INTERNO')[0]).toBeTruthy();
        expect(screen.getAllByText('Falta encofrado en losa')[0]).toBeTruthy();
        expect(screen.getAllByText('Ana Torres')[0]).toBeTruthy();
        expect(
            screen.getAllByText(formatFecha('2026-02-15'))[0],
        ).toBeTruthy();
        expect(screen.getAllByText('Pendiente')[0]).toBeTruthy();
        expect(screen.getAllByText('Actualizado')[0]).toBeTruthy();
        expect(screen.getAllByText('NOTIFICADA')[0]).toBeTruthy();
        expect(screen.getAllByText('Levantada')[0]).toBeTruthy();
        expect(screen.getByText('1 pendientes de levantar')).toBeTruthy();
        expect(
            screen.getAllByRole('button', { name: /Levantar/ })[0],
        ).toBeTruthy();
        expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    });

    it('muestra el estado vacío', () => {
        renderPagina(CalidadPage, { observacionesDb: [] });

        expect(
            screen.getByText('Sin observaciones registradas'),
        ).toBeTruthy();
        expect(screen.getByText('Observaciones (0)')).toBeTruthy();
    });

    it('valida obra y descripción', () => {
        renderPagina(CalidadPage, { observacionesDb: observaciones });

        const enviar = screen.getByRole('button', {
            name: /Registrar Observación/,
        });

        fireEvent.change(screen.getByLabelText(/^Obra/), {
            target: { value: '' },
        });
        fireEvent.click(enviar);
        expect(screen.getByText('Selecciona la obra.')).toBeTruthy();

        fireEvent.change(screen.getByLabelText(/^Obra/), {
            target: { value: '1' },
        });
        fireEvent.change(screen.getByLabelText(/^Descripción/), {
            target: { value: '   ' },
        });
        fireEvent.click(enviar);
        expect(
            screen.getByText('Describe la observación técnica.'),
        ).toBeTruthy();
        expect(llamadasHttp).toHaveLength(0);
    });

    it('registra la observación con campos opcionales en null', () => {
        renderPagina(CalidadPage, { observacionesDb: observaciones });

        fireEvent.change(screen.getByLabelText(/^N° Acta/), {
            target: { value: '  ACTA-1  ' },
        });
        fireEvent.change(screen.getByLabelText(/^Origen/), {
            target: { value: 'auditoria' },
        });
        fireEvent.change(screen.getByLabelText(/^Descripción/), {
            target: { value: '  Concreto fisurado  ' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /Registrar Observación/ }),
        );

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/calidad/observaciones',
                datos: {
                    obra_id: 1,
                    numero_acta: 'ACTA-1',
                    descripcion: 'Concreto fisurado',
                    origen: 'auditoria',
                    plazo_subsanacion: null,
                },
            }),
        );
        expect(
            screen.getByText('Observación técnica registrada.'),
        ).toBeTruthy();
        expect(router.reload).toHaveBeenCalledWith({
            only: ['observacionesDb'],
        });
    });

    it('levanta una observación pendiente', () => {
        renderPagina(CalidadPage, { observacionesDb: observaciones });

        fireEvent.click(
            screen.getAllByRole('button', { name: /Levantar/ })[0],
        );

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/calidad/observaciones/1/levantar',
                datos: { planos_asbuilt_actualizados: true },
            }),
        );
        expect(
            screen.getByText('Observación levantada y subsanada.'),
        ).toBeTruthy();
    });
});
