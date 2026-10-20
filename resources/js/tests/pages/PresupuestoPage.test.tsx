import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import PresupuestoPage from '../../pages/PresupuestoPage';
import { formatMoneda } from '../../utils/format';
import { propsBase } from '../fixtures';
import { renderPagina } from '../harness';
import { setPageProps } from '../mocks/inertia';

const moneda = (n: number) => formatMoneda(n).replace(/\u00a0/g, ' ');

describe('PresupuestoPage', () => {
    beforeEach(() => {
        setPageProps(propsBase());
    });

    it('muestra los rubros presupuestales con su ejecución', () => {
        renderPagina(PresupuestoPage);

        expect(
            screen.getAllByText('Control Presupuestal y Costos por Rubro')[0],
        ).toBeTruthy();
        expect(
            screen.getAllByText(
                'Mano de Obra Directa (Régimen Construcción Civil)',
            )[0],
        ).toBeTruthy();
        expect(screen.getAllByText(moneda(450000))[0]).toBeTruthy();
        expect(screen.getAllByText(moneda(382000))[0]).toBeTruthy();
        expect(screen.getAllByText(moneda(68000))[0]).toBeTruthy();
        expect(screen.getAllByText('84.8%')[0]).toBeTruthy();
        expect(screen.getAllByText('80%').length).toBeGreaterThan(0);
        expect(
            screen.getAllByText('Gastos Generales y Supervisión')[0],
        ).toBeTruthy();
    });
});
