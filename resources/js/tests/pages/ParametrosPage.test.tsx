import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import ParametrosPage from '../../pages/ParametrosPage';
import { propsBase } from '../fixtures';
import { renderPagina } from '../harness';
import { llamadasHttp, router, setPageProps } from '../mocks/inertia';

const parametros = [
    {
        id: 1,
        clave: 'ahp.ratio_consistencia',
        valor: '0.1',
        tipo: 'numero',
    },
    { id: 2, clave: 'geo.radio_busqueda_m', valor: '5000' },
    {
        id: 3,
        clave: 'stock.merma_max_pct',
        valor: '5',
        descripcion: 'Merma máxima permitida',
    },
    { id: 4, clave: 'empresa.nombre', valor: 'Consorcio Pillco' },
];

describe('ParametrosPage', () => {
    beforeEach(() => {
        setPageProps(propsBase());
    });

    it('lista los parámetros con su categoría inferida', () => {
        renderPagina(ParametrosPage, { parametrosDb: parametros });

        expect(
            screen.getAllByText('Parámetros y Constantes del Sistema')[0],
        ).toBeTruthy();
        expect(screen.getAllByText('ahp.ratio_consistencia')[0]).toBeTruthy();
        expect(screen.getAllByText('AHP')[0]).toBeTruthy();
        expect(screen.getAllByText('GEO')[0]).toBeTruthy();
        expect(screen.getAllByText('STOCK')[0]).toBeTruthy();
        expect(screen.getAllByText('GENERAL')[0]).toBeTruthy();
        expect(screen.getAllByText('0.1')[0]).toBeTruthy();
        expect(screen.getAllByText('Merma máxima permitida')[0]).toBeTruthy();
        expect(
            screen.getAllByText(
                'Configuración del parámetro geo.radio_busqueda_m',
            )[0],
        ).toBeTruthy();
    });

    it('filtra por pestaña de categoría y muestra el vacío', () => {
        renderPagina(ParametrosPage, { parametrosDb: parametros });

        fireEvent.click(screen.getByRole('button', { name: 'Ranking / AHP' }));
        expect(screen.getAllByText('ahp.ratio_consistencia')[0]).toBeTruthy();
        expect(screen.queryAllByText('geo.radio_busqueda_m')).toHaveLength(0);

        fireEvent.click(
            screen.getByRole('button', { name: 'Control de Stock & Mermas' }),
        );
        expect(screen.getAllByText('stock.merma_max_pct')[0]).toBeTruthy();
        expect(screen.queryAllByText('empresa.nombre')).toHaveLength(0);
    });

    it('muestra el estado vacío sin parámetros', () => {
        renderPagina(ParametrosPage, { parametrosDb: [] });

        expect(screen.getByText('Sin parámetros registrados')).toBeTruthy();
        expect(
            screen.getByText('No hay parámetros para esta categoría.'),
        ).toBeTruthy();
    });

    it('valida clave y valor antes de crear', () => {
        renderPagina(ParametrosPage, { parametrosDb: parametros });

        fireEvent.click(
            screen.getByRole('button', { name: /Nuevo parámetro/ }),
        );
        expect(screen.getByText('Nuevo Parámetro del Sistema')).toBeTruthy();

        fireEvent.change(screen.getByLabelText(/^Clave/), {
            target: { value: '   ' },
        });
        fireEvent.change(screen.getByLabelText(/^Valor/), {
            target: { value: '   ' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /Crear Parámetro/ }),
        );
        expect(
            screen.getByText('Completa la clave y el valor del parámetro.'),
        ).toBeTruthy();
        expect(llamadasHttp).toHaveLength(0);
    });

    it('crea un parámetro con la descripción opcional en null', () => {
        renderPagina(ParametrosPage, { parametrosDb: parametros });

        fireEvent.click(
            screen.getByRole('button', { name: /Nuevo parámetro/ }),
        );
        fireEvent.change(screen.getByLabelText(/^Clave/), {
            target: { value: '  pmu.umbral_dias  ' },
        });
        fireEvent.change(screen.getByLabelText(/^Valor/), {
            target: { value: ' 15 ' },
        });
        fireEvent.change(screen.getByLabelText(/^Tipo/), {
            target: { value: 'numero' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /Crear Parámetro/ }),
        );

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/parametros',
                datos: {
                    clave: 'pmu.umbral_dias',
                    valor: '15',
                    tipo: 'numero',
                    descripcion: null,
                },
            }),
        );
        expect(
            screen.getByText(
                'Parámetro "pmu.umbral_dias" creado correctamente.',
            ),
        ).toBeTruthy();
        expect(router.reload).toHaveBeenCalledWith({
            only: ['parametrosDb'],
        });
        expect(screen.queryByText('Nuevo Parámetro del Sistema')).toBeNull();
    });

    it('edita un parámetro existente con la clave bloqueada', () => {
        renderPagina(ParametrosPage, { parametrosDb: parametros });

        fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0]);
        expect(
            screen.getByText('Modificar Parámetro del Sistema'),
        ).toBeTruthy();
        expect(
            (screen.getByLabelText(/^Clave/) as HTMLInputElement).disabled,
        ).toBe(true);

        fireEvent.change(screen.getByLabelText(/^Valor/), {
            target: { value: '0.05' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /Guardar Cambios/ }),
        );

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'put',
                url: '/api/v1/parametros/1',
                datos: expect.objectContaining({
                    clave: 'ahp.ratio_consistencia',
                    valor: '0.05',
                }),
            }),
        );
        expect(
            screen.getByText(
                'Parámetro "ahp.ratio_consistencia" actualizado correctamente.',
            ),
        ).toBeTruthy();
    });

    it('elimina un parámetro tras confirmar', () => {
        renderPagina(ParametrosPage, { parametrosDb: parametros });

        fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[0]);
        expect(screen.getByText('Eliminar Parámetro')).toBeTruthy();
        expect(
            screen.getAllByText('ahp.ratio_consistencia').length,
        ).toBeGreaterThan(0);

        fireEvent.click(
            screen
                .getAllByRole('button', { name: 'Eliminar' })
                .at(-1) as HTMLElement,
        );

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'delete',
                url: '/api/v1/parametros/1',
            }),
        );
        expect(
            screen.getByText('Parámetro "ahp.ratio_consistencia" eliminado.'),
        ).toBeTruthy();
        expect(screen.queryByText('Eliminar Parámetro')).toBeNull();
    });

    it('cierra el formulario con Cancelar', () => {
        renderPagina(ParametrosPage, { parametrosDb: parametros });

        fireEvent.click(
            screen.getByRole('button', { name: /Nuevo parámetro/ }),
        );
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

        expect(screen.queryByText('Nuevo Parámetro del Sistema')).toBeNull();
        expect(llamadasHttp).toHaveLength(0);
    });
});
