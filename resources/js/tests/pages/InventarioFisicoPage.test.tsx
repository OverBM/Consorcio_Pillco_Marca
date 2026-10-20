import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import InventarioFisicoPage from '../../pages/InventarioFisicoPage';
import { propsBase } from '../fixtures';
import { renderPagina } from '../harness';
import { llamadasHttp, router, setPageProps } from '../mocks/inertia';

const inventarios = [
    {
        id: 1,
        almacen_id: 1,
        periodo: '2026-01',
        estado: 'en_conteo',
        ciego: true,
        tolerancia_pct: '1',
        cerrado_en: null,
        almacen: { id: 1, nombre: 'Almacén Central' },
        detalles: [
            {
                id: 11,
                material_id: 1,
                cantidad_sistema: 100,
                cantidad_contada: 95,
                justificacion: 'Merma',
                material: {
                    id: 1,
                    nombre: 'Cemento Portland',
                    unidad_medida: { codigo: 'bol' },
                },
            },
            {
                id: 12,
                material_id: 2,
                cantidad_sistema: 50,
                cantidad_contada: null,
                justificacion: null,
                material: null,
            },
            {
                id: 13,
                material_id: 3,
                cantidad_sistema: 20,
                cantidad_contada: 25,
                material: {
                    id: 3,
                    nombre: 'Arena fina',
                    unidad_medida: null,
                },
            },
            {
                id: 14,
                material_id: 4,
                cantidad_sistema: 5,
                justificacion: null,
                material: {
                    id: 4,
                    nombre: 'Clavos de acero',
                    unidad_medida: { codigo: 'kg' },
                },
            },
        ],
    },
    {
        id: 2,
        almacen_id: 2,
        periodo: '2026-02',
        estado: 'cerrado',
        ciego: true,
        tolerancia_pct: 2,
        cerrado_en: '2026-02-28T10:00:00.000Z',
        almacen: null,
        detalles: [
            {
                id: 21,
                material_id: 1,
                cantidad_sistema: 10,
                cantidad_contada: 8,
                justificacion: null,
                material: null,
            },
        ],
    },
    {
        id: 3,
        almacen_id: 3,
        periodo: '2026-03',
        estado: 'borrador',
        ciego: false,
        tolerancia_pct: '0',
        cerrado_en: null,
        almacen: { id: 3, nombre: 'Almacén Auxiliar' },
        detalles: [
            {
                id: 31,
                material_id: 5,
                cantidad_sistema: 5,
                cantidad_contada: 8,
                justificacion: 'Sobrante',
                material: { id: 5, nombre: 'Pintura', unidad_medida: null },
            },
        ],
    },
];

function renderInventario() {
    return renderPagina(InventarioFisicoPage, {
        inventariosDb: inventarios,
    });
}

function programar() {
    fireEvent.click(
        screen.getByRole('button', { name: /Programar Inventario/ }),
    );
}

describe('InventarioFisicoPage', () => {
    beforeEach(() => {
        setPageProps(propsBase());
    });

    it('lista periodos, avances, diferencias y estados', () => {
        renderInventario();

        expect(screen.getAllByText('2026-01')[0]).toBeTruthy();
        expect(screen.getAllByText('2026-02')[0]).toBeTruthy();
        expect(screen.getAllByText('En conteo')[0]).toBeTruthy();
        expect(screen.getAllByText('Cerrado')[0]).toBeTruthy();
        expect(screen.getAllByText('borrador')[0]).toBeTruthy();
        expect(screen.getAllByText('Almacén Central')[0]).toBeTruthy();
        expect(screen.getAllByText('Almacén #2')[0]).toBeTruthy();
        expect(screen.getAllByText('2 / 4 contados')[0]).toBeTruthy();
        expect(screen.getAllByText('1 / 1 contados')[0]).toBeTruthy();
        expect(screen.getAllByText('-2')[0]).toBeTruthy();
        expect(screen.getAllByText('+3')[0]).toBeTruthy();
    });

    it('muestra el estado vacío sin inventarios', () => {
        renderPagina(InventarioFisicoPage, { inventariosDb: [] });

        expect(screen.getByText('Sin inventarios físicos')).toBeTruthy();
        expect(
            screen.getByText('Programa una toma física para un almacén.'),
        ).toBeTruthy();
    });

    it('valida el almacén y el periodo al programar', () => {
        renderInventario();

        programar();
        expect(llamadasHttp).toHaveLength(0);
        expect(
            screen.getByText('Selecciona el almacén a auditar.'),
        ).toBeTruthy();

        fireEvent.change(screen.getByRole('combobox'), {
            target: { value: '1' },
        });
        programar();
        expect(llamadasHttp).toHaveLength(0);
        expect(
            screen.getByText('Indica el periodo (p. ej. 2026-10).'),
        ).toBeTruthy();
    });

    it('programa la toma física con tolerancia por defecto', () => {
        renderInventario();

        fireEvent.change(screen.getByRole('combobox'), {
            target: { value: '2' },
        });
        fireEvent.change(screen.getByPlaceholderText('2026-10'), {
            target: { value: '2026-10' },
        });
        fireEvent.change(screen.getByRole('spinbutton'), {
            target: { value: '' },
        });
        programar();

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/inventario-fisico',
                datos: {
                    almacen_id: 2,
                    periodo: '2026-10',
                    tolerancia_pct: 1,
                },
            }),
        );
        expect(router.reload).toHaveBeenCalledWith({
            only: ['inventariosDb'],
        });
        expect(screen.getByText('Inventario físico programado.')).toBeTruthy();
    });

    it('valida que exista al menos un conteo', () => {
        renderInventario();

        fireEvent.click(screen.getAllByText('Registrar conteo')[0]);
        expect(screen.getAllByText('Conteo físico — 2026-01')[0]).toBeTruthy();

        fireEvent.click(
            screen.getByRole('button', { name: /Registrar y ajustar/ }),
        );

        expect(llamadasHttp).toHaveLength(0);
        expect(
            screen.getByText('Registra al menos un conteo físico.'),
        ).toBeTruthy();
    });

    it('registra conteos con justificación y ajusta el inventario', () => {
        renderInventario();

        fireEvent.click(screen.getAllByText('Registrar conteo')[0]);

        fireEvent.change(
            screen.getByLabelText('Cantidad contada de Cemento Portland'),
            { target: { value: '90' } },
        );
        fireEvent.change(screen.getAllByLabelText('Justificación')[0], {
            target: { value: 'Merma detectada' },
        });
        fireEvent.change(
            screen.getByLabelText('Cantidad contada de Arena fina'),
            { target: { value: '22' } },
        );
        fireEvent.click(
            screen.getByRole('button', { name: /Registrar y ajustar/ }),
        );

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/inventario-fisico/1/conteos',
                datos: {
                    conteos: [
                        {
                            id: 11,
                            cantidad_contada: 90,
                            justificacion: 'Merma detectada',
                        },
                        {
                            id: 13,
                            cantidad_contada: 22,
                            justificacion: null,
                        },
                    ],
                },
            }),
        );
        expect(router.reload).toHaveBeenCalledWith({
            only: ['inventariosDb'],
        });
        expect(
            screen.getByText('Conteos registrados y stock ajustado.'),
        ).toBeTruthy();
        expect(screen.queryByText('Conteo físico — 2026-01')).toBeNull();
    });

    it('cancela el conteo sin registrar movimientos', () => {
        renderInventario();

        fireEvent.click(screen.getAllByText('Registrar conteo')[0]);
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

        expect(screen.queryByText('Conteo físico — 2026-01')).toBeNull();
        expect(llamadasHttp).toHaveLength(0);
    });
});
