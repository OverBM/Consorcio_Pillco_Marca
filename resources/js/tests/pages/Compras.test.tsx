import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import ComprasPage from '../../pages/ComprasPage';
import { propsBase } from '../fixtures';
import { renderPagina } from '../harness';
import { setPageProps } from '../mocks/inertia';

describe('ComprasPage', () => {
    beforeEach(() => {
        setPageProps(propsBase());
    });

    it('muestra el encabezado y los accesos del ciclo de compras', () => {
        renderPagina(ComprasPage);

        expect(screen.getByText('Compras y Abastecimiento')).toBeTruthy();
        expect(screen.getByText('Requerimientos de Compra')).toBeTruthy();
        expect(
            screen.getByText('Cotizaciones y Cuadro Comparativo'),
        ).toBeTruthy();
        expect(screen.getByText('Órdenes de Compra')).toBeTruthy();
        expect(screen.getByText('Proveedores')).toBeTruthy();
        expect(screen.getByText('Devoluciones a Proveedor')).toBeTruthy();
        expect(screen.getByText('Recepciones')).toBeTruthy();
    });

    it('enlaza cada acceso a su ruta', () => {
        renderPagina(ComprasPage);

        const enlaces = screen.getAllByRole('link');
        expect(enlaces).toHaveLength(6);
        expect(enlaces.map((enlace) => enlace.getAttribute('href'))).toEqual([
            '/compras/requerimientos',
            '/compras/cotizaciones',
            '/compras/ordenes-compra',
            '/compras/proveedores',
            '/compras/devoluciones',
            '/recepcion',
        ]);
    });
});
