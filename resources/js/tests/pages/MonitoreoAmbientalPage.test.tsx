import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import MonitoreoAmbientalPage from '../../pages/MonitoreoAmbientalPage';
import { formatFs } from '../../utils/format';
import { propsBase } from '../fixtures';
import { renderPagina } from '../harness';
import { llamadasHttp, router, setPageProps } from '../mocks/inertia';

const indicadores = [
    {
        id: 1,
        codigo: 'PM10',
        nombre: 'Material Particulado PM10',
        unidad: 'µg/m³',
        limite_maximo: 150,
    },
    {
        id: 2,
        codigo: 'RU-01',
        nombre: 'Ruido Ambiental',
        unidad: 'dB',
        limite_maximo: 70,
    },
];

const mediciones = [
    {
        id: 1,
        valor: 180,
        fuera_de_limite: true,
        medido_en: '2026-04-01T09:00:00.000Z',
        medida_correctiva: 'Riego de vías',
        obra: { id: 1, nombre: 'Mejoramiento Vía Huancayo' },
        indicador: indicadores[0],
    },
    {
        id: 2,
        valor: '55',
        fuera_de_limite: false,
        medido_en: '2026-04-02T09:00:00.000Z',
        medida_correctiva: null,
        obra: null,
        indicador: null,
    },
];

describe('MonitoreoAmbientalPage', () => {
    beforeEach(() => {
        setPageProps(propsBase());
    });

    it('lista las mediciones y marca las que superan el LMP', () => {
        renderPagina(MonitoreoAmbientalPage, { medicionesDb: mediciones });

        expect(
            screen.getAllByText('Monitoreo Ambiental y Cumplimiento de LMP')[0],
        ).toBeTruthy();
        expect(screen.getByText('Mediciones Registradas (2)')).toBeTruthy();
        expect(
            screen.getAllByText('Material Particulado PM10')[0],
        ).toBeTruthy();
        expect(
            screen.getAllByText('Mejoramiento Vía Huancayo')[0],
        ).toBeTruthy();
        expect(
            screen.getAllByText(formatFs('2026-04-01T09:00:00.000Z'))[0],
        ).toBeTruthy();
        expect(screen.getAllByText('Supera LMP')[0]).toBeTruthy();
        expect(screen.getAllByText('Dentro de Norma')[0]).toBeTruthy();
        expect(screen.getAllByText('—').length).toBeGreaterThan(0);
        expect(
            screen.getAllByText(
                (_contenido, el) =>
                    el?.tagName === 'TD' &&
                    (el.textContent ?? '').includes('µg/m³'),
            ).length,
        ).toBeGreaterThan(0);
        expect(screen.getByText('1 mediciones exceden el LMP')).toBeTruthy();
    });

    it('muestra el estado vacío', () => {
        renderPagina(MonitoreoAmbientalPage, { medicionesDb: [] });

        expect(screen.getByText('Sin mediciones ambientales')).toBeTruthy();
        expect(screen.getByText('Mediciones Registradas (0)')).toBeTruthy();
        expect(screen.getByText('0 mediciones exceden el LMP')).toBeTruthy();
    });

    it('valida obra, indicador y valor medido', () => {
        renderPagina(MonitoreoAmbientalPage, {
            medicionesDb: mediciones,
            indicadoresDb: indicadores,
        });

        fireEvent.change(screen.getByLabelText(/^Obra/), {
            target: { value: '' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /Registrar Medición/ }),
        );
        expect(screen.getByText('Selecciona la obra.')).toBeTruthy();

        fireEvent.change(screen.getByLabelText(/^Obra/), {
            target: { value: '1' },
        });
        fireEvent.change(screen.getByLabelText(/^Indicador Ambiental/), {
            target: { value: '' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /Registrar Medición/ }),
        );
        expect(
            screen.getByText('Selecciona el parámetro ambiental.'),
        ).toBeTruthy();

        fireEvent.change(screen.getByLabelText(/^Indicador Ambiental/), {
            target: { value: '1' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /Registrar Medición/ }),
        );
        expect(
            screen.getAllByText('Ingresa un valor medido válido.')[0],
        ).toBeTruthy();
        expect(llamadasHttp).toHaveLength(0);
    });

    it('registra la medición y muestra el LMP del indicador', () => {
        renderPagina(MonitoreoAmbientalPage, {
            medicionesDb: mediciones,
            indicadoresDb: indicadores,
        });

        fireEvent.change(screen.getByLabelText(/^Indicador Ambiental/), {
            target: { value: '2' },
        });
        expect(screen.getByText(/LMP: 70 dB/)).toBeTruthy();

        fireEvent.change(screen.getByLabelText(/^Valor Medido/), {
            target: { value: '68.5' },
        });
        fireEvent.change(screen.getByLabelText(/^Medida Correctiva/), {
            target: { value: '   ' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /Registrar Medición/ }),
        );

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/ambiente/mediciones',
                datos: {
                    obra_id: 1,
                    indicador_id: 2,
                    valor: 68.5,
                    medida_correctiva: null,
                },
            }),
        );
        expect(screen.getByText('Medición ambiental registrada.')).toBeTruthy();
        expect(router.reload).toHaveBeenCalledWith({
            only: ['medicionesDb'],
        });
    });
});
