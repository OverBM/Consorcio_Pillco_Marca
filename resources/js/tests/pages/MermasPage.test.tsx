import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import MermasPage from '../../pages/MermasPage';
import { formatFs } from '../../utils/format';
import { propsBase } from '../fixtures';
import { renderPagina } from '../harness';
import { llamadasHttp, router, setPageProps } from '../mocks/inertia';

const mermas = [
    {
        id: 1,
        almacen_id: 1,
        material_id: 1,
        cantidad: 12.5,
        causa: 'robo',
        justificacion: 'Hurto en almacén',
        estado: 'registrada',
        created_at: '2026-03-01T08:00:00.000Z',
        almacen: { id: 1, nombre: 'Almacén Central' },
        material: {
            id: 1,
            nombre: 'Cemento Portland',
            unidad_medida: { codigo: 'bol' },
        },
    },
    {
        id: 2,
        almacen_id: 2,
        material_id: 2,
        cantidad: '3',
        causa: 'deterioro',
        justificacion: 'Sacos humedecidos',
        estado: 'registrada',
        created_at: '2026-03-02T08:00:00.000Z',
        almacen: null,
        material: null,
    },
];

describe('MermasPage', () => {
    beforeEach(() => {
        setPageProps(propsBase());
    });

    it('lista las mermas con material, almacén y clasificación', () => {
        renderPagina(MermasPage, { mermasDb: mermas });

        expect(
            screen.getAllByText('Mermas y Materiales Dañados')[0],
        ).toBeTruthy();
        expect(screen.getByText('Registro de Mermas (2)')).toBeTruthy();
        expect(screen.getAllByText('Cemento Portland')[0]).toBeTruthy();
        expect(screen.getAllByText('Material #2')[0]).toBeTruthy();
        expect(screen.getAllByText('Almacén Central')[0]).toBeTruthy();
        expect(screen.getAllByText('Almacén #2')[0]).toBeTruthy();
        expect(screen.getAllByText('ROBO')[0]).toBeTruthy();
        expect(screen.getAllByText('DETERIORO')[0]).toBeTruthy();
        expect(screen.getAllByText('Hurto en almacén')[0]).toBeTruthy();
        expect(
            screen.getAllByText(formatFs('2026-03-01T08:00:00.000Z'))[0],
        ).toBeTruthy();
        expect(screen.getAllByText('registrada')[0]).toBeTruthy();
        expect(
            screen.getAllByText(
                (_contenido, el) =>
                    el?.tagName === 'P' &&
                    (el.textContent ?? '').includes('bol'),
            )[0],
        ).toBeTruthy();
    });

    it('filtra por material, almacén o causa', () => {
        renderPagina(MermasPage, { mermasDb: mermas });

        const buscador = screen.getByPlaceholderText(
            /Buscar por material, almacén o causa/,
        );

        fireEvent.change(buscador, { target: { value: 'robo' } });
        expect(screen.getByText('Registro de Mermas (1)')).toBeTruthy();
        expect(screen.queryAllByText('Sacos humedecidos')).toHaveLength(0);

        fireEvent.change(buscador, { target: { value: 'almacén central' } });
        expect(screen.getAllByText('Cemento Portland')[0]).toBeTruthy();

        fireEvent.change(buscador, { target: { value: 'inexistente' } });
        expect(
            screen.getAllByText(
                'No hay mermas que coincidan con la búsqueda.',
            )[0],
        ).toBeTruthy();
    });

    it('muestra el estado vacío', () => {
        renderPagina(MermasPage, { mermasDb: [] });

        expect(screen.getByText('Sin mermas registradas')).toBeTruthy();
        expect(screen.getByText('Registro de Mermas (0)')).toBeTruthy();
    });

    it('valida almacén, material, cantidad y justificación', () => {
        renderPagina(MermasPage, { mermasDb: mermas });

        const enviar = screen.getByRole('button', {
            name: /Registrar y Procesar Baja/,
        });

        fireEvent.click(enviar);
        expect(screen.getByText('Selecciona almacén y material.')).toBeTruthy();

        fireEvent.change(screen.getByLabelText(/^Almacén/), {
            target: { value: '1' },
        });
        fireEvent.change(screen.getByLabelText(/^Material/), {
            target: { value: '1' },
        });
        fireEvent.change(screen.getByLabelText(/^Cantidad/), {
            target: { value: '0' },
        });
        fireEvent.click(enviar);
        expect(
            screen.getByText(
                'La cantidad a dar de baja debe ser mayor a cero.',
            ),
        ).toBeTruthy();

        fireEvent.change(screen.getByLabelText(/^Cantidad/), {
            target: { value: '2' },
        });
        fireEvent.change(screen.getByLabelText(/^Causa o incidente/), {
            target: { value: '   ' },
        });
        fireEvent.click(enviar);
        expect(
            screen.getByText('Describe la causa o incidente.'),
        ).toBeTruthy();
        expect(llamadasHttp).toHaveLength(0);
    });

    it('registra la merma con cantidad numérica', () => {
        renderPagina(MermasPage, { mermasDb: mermas });

        fireEvent.change(screen.getByLabelText(/^Almacén/), {
            target: { value: '2' },
        });
        fireEvent.change(screen.getByLabelText(/^Material/), {
            target: { value: '2' },
        });
        fireEvent.change(screen.getByLabelText(/^Cantidad/), {
            target: { value: '4.5' },
        });
        fireEvent.change(screen.getByLabelText(/^Clasificación/), {
            target: { value: 'derrame' },
        });
        fireEvent.change(screen.getByLabelText(/^Causa o incidente/), {
            target: { value: 'Derrame de aditivo' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /Registrar y Procesar Baja/ }),
        );

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/mermas',
                datos: {
                    almacen_id: 2,
                    material_id: 2,
                    cantidad: 4.5,
                    causa: 'derrame',
                    justificacion: 'Derrame de aditivo',
                },
            }),
        );
        expect(
            screen.getByText('Merma registrada y stock ajustado.'),
        ).toBeTruthy();
        expect(router.reload).toHaveBeenCalledWith({ only: ['mermasDb'] });
    });
});
