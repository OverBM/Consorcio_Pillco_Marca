import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import CierreObraPage from '../../pages/CierreObraPage';
import { formatCantidad, formatFecha } from '../../utils/format';
import { propsBase } from '../fixtures';
import { renderPagina } from '../harness';
import {
    llamadasHttp,
    respuestaHttp,
    router,
    setPageProps,
} from '../mocks/inertia';

const obras = [
    {
        id: 1,
        nombre: 'Mejoramiento Vía Huancayo',
        distrito: 'Huancayo',
        estado: 'activa',
    },
    { id: 2, nombre: 'Ampliación Puente', distrito: null, estado: 'activa' },
];

const detalle = {
    obra: obras[0],
    cierre: {
        id: 1,
        obra_id: 1,
        fecha_ejecucion_100: '2026-01-15',
        fecha_recepcion_obra: null,
        estado: 'en_cierre',
        excedentes_evaluados: true,
    },
    excedentes: [
        {
            id: 1,
            cantidad: '12.5',
            material: {
                id: 1,
                nombre: 'Cemento Portland',
                unidad_medida: { codigo: 'bol' },
            },
        },
        { id: 2, cantidad: 3, material: null },
    ],
};

describe('CierreObraPage', () => {
    beforeEach(() => {
        setPageProps(propsBase());
        respuestaHttp.data = detalle;
    });

    it('carga el estado del cierre y los excedentes', () => {
        renderPagina(CierreObraPage, { obrasDb: obras });

        expect(
            screen.getAllByText('Cierre y Liquidación de Obra')[0],
        ).toBeTruthy();
        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'get',
                url: '/api/v1/cierres-obra/1',
            }),
        );
        expect(screen.getAllByText('en cierre')[0]).toBeTruthy();
        expect(screen.getAllByText(formatFecha('2026-01-15'))[0]).toBeTruthy();
        expect(screen.getAllByText('Pendiente')[0]).toBeTruthy();
        expect(
            screen.getByText('Excedentes detectados:').closest('div')
                ?.textContent,
        ).toContain('2');
        expect(
            screen.getAllByText('Excedentes para Redistribución (2)')[0],
        ).toBeTruthy();
        expect(screen.getAllByText('Cemento Portland')[0]).toBeTruthy();
        expect(
            screen.getAllByText(`${formatCantidad(12.5)} bol`)[0],
        ).toBeTruthy();
        expect(screen.getAllByText('—')[0]).toBeTruthy();
    });

    it('informa cuando no hay obras registradas', () => {
        renderPagina(CierreObraPage, { obrasDb: [] });

        expect(screen.getByText('Sin obras registradas')).toBeTruthy();
        expect(llamadasHttp).toHaveLength(0);
    });

    it('muestra el vacío de excedentes y el estado sin iniciar', () => {
        respuestaHttp.data = {
            obra: obras[0],
            cierre: null,
            excedentes: [],
        };
        renderPagina(CierreObraPage, { obrasDb: obras });

        expect(screen.getAllByText('sin iniciar')[0]).toBeTruthy();
        expect(screen.getAllByText('Pendiente').length).toBeGreaterThan(1);
        expect(screen.getByText('Sin excedentes')).toBeTruthy();
        expect(
            screen.getAllByText('Excedentes para Redistribución (0)')[0],
        ).toBeTruthy();
    });

    it('inicia el cierre de la obra', () => {
        renderPagina(CierreObraPage, { obrasDb: obras });

        fireEvent.click(screen.getByRole('button', { name: /Iniciar Cierre/ }));

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/cierres-obra/1/iniciar',
            }),
        );
        expect(screen.getByText('Proceso de cierre iniciado.')).toBeTruthy();
        expect(router.reload).toHaveBeenCalledWith({ only: ['obrasDb'] });
    });

    it('finaliza y liquida la obra', () => {
        renderPagina(CierreObraPage, { obrasDb: obras });

        fireEvent.click(
            screen.getByRole('button', { name: /Finalizar y Liquidar/ }),
        );

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/cierres-obra/1/finalizar',
            }),
        );
        expect(screen.getByText('Obra liquidada y cerrada.')).toBeTruthy();
    });

    it('deshabilita las acciones con el cierre cerrado', () => {
        respuestaHttp.data = {
            ...detalle,
            cierre: { ...detalle.cierre, estado: 'cerrado' },
        };
        renderPagina(CierreObraPage, { obrasDb: obras });

        expect(
            (
                screen.getByRole('button', {
                    name: /Iniciar Cierre/,
                }) as HTMLButtonElement
            ).disabled,
        ).toBe(true);
        expect(
            (
                screen.getByRole('button', {
                    name: /Finalizar y Liquidar/,
                }) as HTMLButtonElement
            ).disabled,
        ).toBe(true);
    });
});
