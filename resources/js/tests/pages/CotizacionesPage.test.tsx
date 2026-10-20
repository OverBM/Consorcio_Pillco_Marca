import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import CotizacionesPage from '../../pages/CotizacionesPage';
import { propsBase } from '../fixtures';
import { renderPagina } from '../harness';
import { llamadasHttp, router, setPageProps } from '../mocks/inertia';

const requerimientos = [
    {
        id: 10,
        codigo: 'REQ-010',
        detalles: [{ id: 1, material_id: 1, cantidad: 3 }],
    },
    { id: 20, codigo: 'REQ-020' },
];

const proveedores = [
    { id: 1, ruc: '20123456789', razon_social: 'Ferretería Andina SAC' },
];

const cotizaciones = [
    {
        id: 1,
        requerimiento_id: 10,
        proveedor_id: 1,
        total: 1000,
        plazo_entrega_dias: 5,
        condiciones: 'Crédito 30 días',
        estado: 'recibida',
        requerimiento: { id: 10, codigo: 'REQ-010' },
        proveedor: {
            id: 1,
            ruc: '20123456789',
            razon_social: 'Ferretería Andina SAC',
        },
        detalles: [
            {
                id: 1,
                material_id: 1,
                cantidad: 3,
                precio_unitario: 333.33,
                material: { id: 1, nombre: 'Cemento Portland' },
            },
        ],
    },
    {
        id: 2,
        requerimiento_id: 20,
        proveedor_id: 9,
        total: '500',
        plazo_entrega_dias: null,
        condiciones: null,
        estado: 'seleccionada',
        requerimiento: null,
        proveedor: null,
        detalles: [],
    },
];

function props(datos: Record<string, unknown> = {}) {
    return {
        cotizacionesDb: cotizaciones,
        requerimientosDb: requerimientos,
        proveedoresDb: proveedores,
        ...datos,
    };
}

describe('CotizacionesPage', () => {
    beforeEach(() => {
        setPageProps(propsBase());
    });

    it('resume los indicadores y lista las ofertas', () => {
        renderPagina(CotizacionesPage, props());

        expect(
            screen.getAllByText('Cuadro Comparativo y Cotizaciones')[0],
        ).toBeTruthy();
        expect(screen.getByText('Cotizaciones (2)')).toBeTruthy();
        expect(screen.getAllByText('Ofertas recibidas')[0]).toBeTruthy();
        expect(screen.getAllByText('Adjudicadas')[0]).toBeTruthy();
        expect(screen.getAllByText('Monto ofertado')[0]).toBeTruthy();
        expect(screen.getAllByText('REQ-010')[0]).toBeTruthy();
        expect(screen.getAllByText('#20')[0]).toBeTruthy();
        expect(screen.getAllByText('Ferretería Andina SAC')[0]).toBeTruthy();
        expect(screen.getAllByText('RUC: 20123456789')[0]).toBeTruthy();
        expect(screen.getAllByText('RUC: —')[0]).toBeTruthy();
        expect(screen.getAllByText('5 días')[0]).toBeTruthy();
        expect(screen.getAllByText('— días')[0]).toBeTruthy();
        expect(screen.getAllByText('En evaluación')[0]).toBeTruthy();
        expect(screen.getAllByText('Adjudicada')[0]).toBeTruthy();
        expect(screen.getAllByText('Adjudicar')[0]).toBeTruthy();
    });

    it('muestra el estado vacío sin cotizaciones', () => {
        renderPagina(CotizacionesPage, props({ cotizacionesDb: [] }));

        expect(screen.getByText('Sin cotizaciones registradas')).toBeTruthy();
        expect(screen.getByText('Cotizaciones (0)')).toBeTruthy();
    });

    it('filtra por búsqueda y por requerimiento', () => {
        renderPagina(CotizacionesPage, props());

        const buscador = screen.getByPlaceholderText(
            'Buscar por proveedor, RUC o requerimiento…',
        );
        fireEvent.change(buscador, { target: { value: 'req-010' } });
        expect(
            screen.getAllByText('REQ-010', { selector: 'td' })[0],
        ).toBeTruthy();
        expect(screen.queryAllByText('#20', { selector: 'td' })).toHaveLength(
            0,
        );
        expect(screen.getByText('Cotizaciones (1)')).toBeTruthy();

        fireEvent.change(buscador, { target: { value: 'zzz' } });
        expect(
            screen.getByText(
                'No hay cotizaciones que coincidan con los filtros.',
            ),
        ).toBeTruthy();

        fireEvent.change(buscador, { target: { value: '' } });
        fireEvent.change(screen.getByLabelText('Filtrar requerimiento'), {
            target: { value: '10' },
        });
        expect(
            screen.getAllByText('REQ-010', { selector: 'td' })[0],
        ).toBeTruthy();
        expect(screen.queryAllByText('#20', { selector: 'td' })).toHaveLength(
            0,
        );
    });

    it('valida requerimiento, proveedor y detalle', () => {
        renderPagina(CotizacionesPage, props());

        const enviar = screen.getByRole('button', {
            name: /Registrar Oferta/,
        });

        fireEvent.click(enviar);
        expect(
            screen.getByText('Selecciona el requerimiento y el proveedor.'),
        ).toBeTruthy();

        fireEvent.change(screen.getByLabelText(/^Requerimiento/), {
            target: { value: '20' },
        });
        fireEvent.change(screen.getByLabelText(/^Proveedor/), {
            target: { value: '1' },
        });
        fireEvent.click(enviar);
        expect(
            screen.getByText(
                'Agrega al menos un material con cantidad y precio.',
            ),
        ).toBeTruthy();
        expect(llamadasHttp).toHaveLength(0);
    });

    it('registra una oferta con los tipos numéricos correctos', () => {
        renderPagina(CotizacionesPage, props());

        fireEvent.change(screen.getByLabelText(/^Requerimiento/), {
            target: { value: '10' },
        });
        fireEvent.change(screen.getByLabelText(/^Proveedor/), {
            target: { value: '1' },
        });
        expect(
            screen.getAllByText('Solicitado: Cemento Portland')[0],
        ).toBeTruthy();
        fireEvent.change(screen.getByLabelText('Precio unitario'), {
            target: { value: '120.5' },
        });
        fireEvent.change(screen.getByLabelText(/^Plazo/), {
            target: { value: '12' },
        });
        fireEvent.change(screen.getByLabelText(/^Condiciones/), {
            target: { value: 'Contado' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /Registrar Oferta/ }),
        );

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/cotizaciones',
                datos: {
                    requerimiento_id: 10,
                    proveedor_id: 1,
                    plazo_entrega_dias: 12,
                    condiciones: 'Contado',
                    detalles: [
                        {
                            material_id: 1,
                            cantidad: 3,
                            precio_unitario: 120.5,
                        },
                    ],
                },
            }),
        );
        expect(router.reload).toHaveBeenCalledWith({
            only: ['cotizacionesDb'],
        });
    });

    it('añade y quita líneas del detalle', () => {
        renderPagina(CotizacionesPage, props());

        expect(screen.getAllByLabelText('Material')).toHaveLength(1);
        fireEvent.click(screen.getByText('+ Añadir material'));
        expect(screen.getAllByLabelText('Material')).toHaveLength(2);
        fireEvent.click(screen.getAllByLabelText('Quitar material')[0]);
        expect(screen.getAllByLabelText('Material')).toHaveLength(1);
    });

    it('adjudica una cotización previa validación del motivo', () => {
        renderPagina(CotizacionesPage, props());

        fireEvent.click(screen.getAllByText('Adjudicar')[0]);
        expect(screen.getByText('Adjudicar cotización')).toBeTruthy();
        expect(screen.getAllByText('Ferretería Andina SAC')[0]).toBeTruthy();

        fireEvent.click(
            screen
                .getAllByRole('button', { name: 'Adjudicar' })
                .at(-1) as HTMLElement,
        );
        expect(
            screen.getByText('Indica el motivo de la selección.'),
        ).toBeTruthy();
        expect(llamadasHttp).toHaveLength(0);

        fireEvent.change(screen.getByLabelText(/^Motivo de la selección/), {
            target: { value: 'Mejor precio y plazo' },
        });
        fireEvent.click(
            screen
                .getAllByRole('button', { name: 'Adjudicar' })
                .at(-1) as HTMLElement,
        );

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/cotizaciones/1/seleccionar',
                datos: { motivo_seleccion: 'Mejor precio y plazo' },
            }),
        );
        expect(
            screen.getByText('Cotización adjudicada como ganadora.'),
        ).toBeTruthy();
        expect(router.reload).toHaveBeenCalledWith({
            only: ['cotizacionesDb'],
        });
    });

    it('cierra el modal de adjudicación con Cancelar', () => {
        renderPagina(CotizacionesPage, props());

        fireEvent.click(screen.getAllByText('Adjudicar')[0]);
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

        expect(screen.queryByText('Adjudicar cotización')).toBeNull();
        expect(llamadasHttp).toHaveLength(0);
    });
});
