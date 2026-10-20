import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import StockPage from '../../pages/StockPage';
import { propsBase } from '../fixtures';
import { renderPagina } from '../harness';
import { llamadasHttp, respuestaHttp, setPageProps } from '../mocks/inertia';

const stock = [
    {
        id: '1',
        almacenId: '1',
        almacenNombre: 'Almacén Central',
        materialId: '1',
        materialCodigo: 'MAT-01',
        materialNombre: 'Cemento Portland',
        unidad: 'bol',
        cantidad: 120,
        cantidadReservada: 0,
        disponible: 110,
        stockMinimo: 50,
        stockSeguridad: 20,
        puntoReorden: 30,
        estado: 'optimo',
    },
    {
        id: '2',
        almacenId: '2',
        almacenNombre: 'Almacén Frente 2',
        materialId: '1',
        materialCodigo: 'MAT-01',
        materialNombre: 'Cemento Portland',
        unidad: 'bol',
        cantidad: 15,
        cantidadReservada: 0,
        disponible: 15,
        stockMinimo: 50,
        stockSeguridad: 20,
        puntoReorden: 30,
        estado: 'bajo',
    },
    {
        id: '3',
        almacenId: '1',
        almacenNombre: 'Almacén Central',
        materialId: '2',
        materialCodigo: 'MAT-02',
        materialNombre: 'Acero corrugado 1/2"',
        unidad: 'kg',
        cantidad: 0,
        cantidadReservada: 0,
        disponible: 0,
        stockMinimo: 80,
        stockSeguridad: 40,
        puntoReorden: 60,
        estado: 'critico',
    },
    {
        id: '4',
        almacenId: '3',
        almacenNombre: 'Almacén Auxiliar',
        materialId: '2',
        materialCodigo: 'MAT-02',
        materialNombre: 'Acero corrugado 1/2"',
        unidad: 'kg',
        cantidad: 40,
        cantidadReservada: 5,
        disponible: 35,
        stockMinimo: 80,
        stockSeguridad: 40,
        puntoReorden: 60,
        estado: 'optimo',
    },
];

const almacenes = [
    { id: '1', nombre: 'Almacén Central' },
    { id: '2', nombre: 'Almacén Frente 2' },
];

const kardex = [
    {
        id: 1,
        tipo_movimiento: 'ingreso_compra',
        cantidad: 50,
        saldo_resultante: 120,
        documento_tipo: 'OC',
        documento_id: 55,
        observacion: 'Ingreso por compra',
        created_at: '2026-01-10T08:00:00.000Z',
        usuario: { nombre: 'Luis Quispe' },
    },
    {
        id: 2,
        tipo_movimiento: 'egreso_despacho',
        cantidad: '20',
        saldo_resultante: '100',
        documento_tipo: null,
        documento_id: null,
        observacion: null,
        created_at: '2026-01-11T08:00:00.000Z',
        usuario: null,
    },
];

function renderStock() {
    return renderPagina(StockPage, { stockDb: stock, almacenesDb: almacenes });
}

describe('StockPage', () => {
    beforeEach(() => {
        setPageProps(propsBase());
    });

    it('muestra la matriz multi-almacén con estados y reservas', () => {
        renderStock();

        expect(screen.getAllByText('Cemento Portland')[0]).toBeTruthy();
        expect(screen.getAllByText('Acero corrugado 1/2"')[0]).toBeTruthy();
        expect(screen.getAllByText('Óptimo')[0]).toBeTruthy();
        expect(screen.getAllByText('Stock bajo')[0]).toBeTruthy();
        expect(screen.getAllByText('Crítico')[0]).toBeTruthy();
        expect(screen.getAllByText('Reserv.: 5')[0]).toBeTruthy();
        expect(
            screen.getAllByRole('columnheader', {
                name: 'Almacén Auxiliar',
            })[0],
        ).toBeTruthy();
    });

    it('filtra por código o nombre y muestra el estado vacío', () => {
        renderStock();

        const buscador = screen.getByPlaceholderText('Buscar código o nombre…');
        fireEvent.change(buscador, { target: { value: 'acero' } });
        expect(screen.queryByText('Cemento Portland')).toBeNull();
        expect(screen.getAllByText('Acero corrugado 1/2"')[0]).toBeTruthy();

        fireEvent.change(buscador, { target: { value: 'MAT-01' } });
        expect(screen.getAllByText('Cemento Portland')[0]).toBeTruthy();

        fireEvent.change(buscador, { target: { value: 'inexistente' } });
        expect(screen.getByText('Sin resultados')).toBeTruthy();
    });

    it('filtra por estado y por almacén', () => {
        renderStock();

        const filtroEstado = screen.getByLabelText('Filtrar por estado');
        fireEvent.change(filtroEstado, { target: { value: 'bajo' } });
        expect(screen.getAllByText('Cemento Portland')[0]).toBeTruthy();
        expect(screen.queryByText('Acero corrugado 1/2"')).toBeNull();

        fireEvent.change(filtroEstado, { target: { value: 'reservado' } });
        expect(screen.queryByText('Cemento Portland')).toBeNull();
        expect(screen.getAllByText('Acero corrugado 1/2"')[0]).toBeTruthy();

        fireEvent.change(filtroEstado, { target: { value: 'critico' } });
        expect(screen.getAllByText('Cemento Portland')[0]).toBeTruthy();
        expect(screen.getAllByText('Acero corrugado 1/2"')[0]).toBeTruthy();

        fireEvent.change(filtroEstado, { target: { value: 'todos' } });
        fireEvent.change(screen.getByLabelText('Filtrar por almacén'), {
            target: { value: '2' },
        });
        expect(
            screen.queryByRole('columnheader', { name: 'Almacén Central' }),
        ).toBeNull();
        expect(
            screen.getAllByRole('columnheader', {
                name: 'Almacén Frente 2',
            })[0],
        ).toBeTruthy();
    });

    it('exporta la matriz filtrada a CSV', () => {
        const click = vi
            .spyOn(HTMLAnchorElement.prototype, 'click')
            .mockImplementation(() => undefined);

        renderStock();

        fireEvent.click(
            screen.getByRole('button', { name: /Exportar Matriz CSV/ }),
        );

        expect(click).toHaveBeenCalled();
        click.mockRestore();
    });

    it('deshabilita la exportación y muestra vacío sin datos', () => {
        renderPagina(StockPage, { stockDb: [] });

        const boton = screen.getByRole('button', {
            name: /Exportar Matriz CSV/,
        });
        expect(boton.hasAttribute('disabled')).toBe(true);
        expect(screen.getByText('Sin resultados')).toBeTruthy();
    });

    it('abre el detalle y consulta el kardex sin movimientos', () => {
        respuestaHttp.data = [];
        renderStock();

        fireEvent.click(screen.getAllByText('Cemento Portland')[0]);
        expect(
            screen.getAllByText('Disponibilidad por almacén')[0],
        ).toBeTruthy();
        expect(
            screen.getAllByText(
                'Selecciona un almacén para consultar sus movimientos.',
            )[0],
        ).toBeTruthy();

        fireEvent.click(screen.getAllByText('Ver kardex')[0]);

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'get',
                url: '/api/v1/stock/almacenes/1/kardex?material_id=1',
            }),
        );
        expect(
            screen.getAllByText(
                'Sin movimientos registrados en este almacén.',
            )[0],
        ).toBeTruthy();

        fireEvent.click(screen.getByLabelText('Cerrar'));
        expect(screen.queryByText('Disponibilidad por almacén')).toBeNull();
    });

    it('renderiza los movimientos del kardex y cierra con el fondo', () => {
        respuestaHttp.data = kardex;
        renderStock();

        fireEvent.click(screen.getAllByText('Acero corrugado 1/2"')[0]);
        fireEvent.click(screen.getAllByText('Ver kardex')[0]);

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'get',
                url: '/api/v1/stock/almacenes/1/kardex?material_id=2',
            }),
        );
        expect(screen.getAllByText('ingreso_compra')[0]).toBeTruthy();
        expect(screen.getAllByText('egreso_despacho')[0]).toBeTruthy();
        expect(screen.getAllByText('OC #55')[0]).toBeTruthy();
        expect(screen.getAllByText('Luis Quispe')[0]).toBeTruthy();
        expect(screen.getAllByText('Ingreso por compra')[0]).toBeTruthy();

        fireEvent.click(screen.getByLabelText('Cerrar modal'));
        expect(screen.queryByText('Disponibilidad por almacén')).toBeNull();
    });
});
