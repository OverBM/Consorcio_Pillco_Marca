import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import CronogramaEvmPage from '../../pages/CronogramaEvmPage';
import { formatFecha, formatMoneda } from '../../utils/format';
import { propsBase } from '../fixtures';
import { renderPagina } from '../harness';
import { llamadasHttp, router, setPageProps } from '../mocks/inertia';

const obras = [
    { id: 1, nombre: 'Mejoramiento Vía Huancayo', distrito: 'Huancayo' },
    { id: 2, nombre: 'Ampliación Puente', distrito: null },
];

const evmData = {
    obraId: '1',
    nombre: 'Mejoramiento Vía Huancayo',
    bac: 1400000,
    pv: 700000,
    ev: 650000,
    ac: 640000,
    cv: 10000,
    sv: -50000,
    cpi: 1.015625,
    spi: 0.928571,
    eac: 1420000,
    vac: -20000,
    saludCosto: 'ok',
    saludTiempo: 'alerta',
};

const hitos = [
    {
        id: 1,
        obra_id: 1,
        nombre: 'Culminación movimiento de tierras',
        fecha_planificada: '2026-03-15',
        fecha_real: null,
        estado: 'en_proceso',
    },
    {
        id: 2,
        obra_id: 1,
        nombre: 'Entrega de obra',
        fecha_planificada: '2026-06-30',
        fecha_real: '2026-06-28',
        estado: 'cumplido',
    },
    {
        id: 3,
        obra_id: 2,
        nombre: 'Hito de otra obra',
        fecha_planificada: '2026-09-01',
        fecha_real: null,
        estado: 'retrasado',
    },
];

function props(datos: Record<string, unknown> = {}) {
    return { obrasDb: obras, evmData, hitosDb: hitos, ...datos };
}

const moneda = (n: number) => formatMoneda(n).replace(/\u00a0/g, ' ');

describe('CronogramaEvmPage', () => {
    beforeEach(() => {
        setPageProps(propsBase());
    });

    it('muestra los indicadores EVM y los hitos de la obra', () => {
        renderPagina(CronogramaEvmPage, props());

        expect(
            screen.getAllByText(
                'Cronograma y Gestión de Valor Ganado (EVM)',
            )[0],
        ).toBeTruthy();
        expect(screen.getByText('0.9286')).toBeTruthy();
        expect(screen.getByText('1.0156')).toBeTruthy();
        expect(
            screen.getAllByText(`SV: ${moneda(-50000)}`)[0],
        ).toBeTruthy();
        expect(
            screen.getAllByText(`CV: ${moneda(10000)}`)[0],
        ).toBeTruthy();
        expect(screen.getAllByText(moneda(1420000))[0]).toBeTruthy();
        expect(
            screen.getAllByText(`BAC: ${moneda(1400000)}`)[0],
        ).toBeTruthy();
        expect(
            screen.getAllByText('Obra: Mejoramiento Vía Huancayo')[0],
        ).toBeTruthy();
        expect(
            screen.getAllByText('Culminación movimiento de tierras')[0],
        ).toBeTruthy();
        expect(
            screen.getAllByText(formatFecha('2026-03-15'))[0],
        ).toBeTruthy();
        expect(
            screen.getAllByText(formatFecha('2026-06-28'))[0],
        ).toBeTruthy();
        expect(screen.getAllByText('en proceso')[0]).toBeTruthy();
        expect(screen.getAllByText('cumplido')[0]).toBeTruthy();
        expect(screen.queryAllByText('Hito de otra obra')).toHaveLength(0);
    });

    it('cambia de obra y filtra sus hitos', () => {
        renderPagina(CronogramaEvmPage, props());

        fireEvent.change(screen.getAllByRole('combobox')[0], {
            target: { value: '2' },
        });

        expect(screen.getAllByText('Hito de otra obra')[0]).toBeTruthy();
        expect(screen.getAllByText('retrasado')[0]).toBeTruthy();
        expect(
            screen.queryAllByText('Culminación movimiento de tierras'),
        ).toHaveLength(0);
    });

    it('muestra los estados vacíos sin EVM ni hitos', () => {
        renderPagina(CronogramaEvmPage, {
            obrasDb: obras,
            evmData: null,
            hitosDb: [],
        });

        expect(screen.getByText('Sin datos EVM')).toBeTruthy();
        expect(screen.getByText('Sin hitos registrados')).toBeTruthy();
    });

    it('valida obra, nombre y fecha del hito', () => {
        renderPagina(CronogramaEvmPage, {
            obrasDb: [],
            evmData: null,
            hitosDb: [],
        });

        fireEvent.click(
            screen.getByRole('button', { name: /Registrar Hito/ }),
        );
        expect(screen.getByText('Selecciona una obra.')).toBeTruthy();
        expect(llamadasHttp).toHaveLength(0);
    });

    it('valida el nombre y la fecha planificada', () => {
        renderPagina(CronogramaEvmPage, props());

        fireEvent.click(
            screen.getByRole('button', { name: /Registrar Hito/ }),
        );
        expect(
            screen.getByText('Indica el nombre y la fecha planificada del hito.'),
        ).toBeTruthy();
        expect(llamadasHttp).toHaveLength(0);
    });

    it('registra un hito en el cronograma', () => {
        renderPagina(CronogramaEvmPage, props());

        fireEvent.change(screen.getByLabelText(/^Nombre del Hito/), {
            target: { value: 'Hito final' },
        });
        fireEvent.change(screen.getByLabelText(/^Fecha Planificada/), {
            target: { value: '2026-12-31' },
        });
        fireEvent.change(screen.getByLabelText(/^Estado/), {
            target: { value: 'cumplido' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /Registrar Hito/ }),
        );

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/proyectos/1/hitos',
                datos: {
                    nombre: 'Hito final',
                    fecha_planificada: '2026-12-31',
                    estado: 'cumplido',
                },
            }),
        );
        expect(
            screen.getByText('Hito registrado en el cronograma.'),
        ).toBeTruthy();
        expect(router.reload).toHaveBeenCalledWith({ only: ['hitosDb'] });
    });
});
