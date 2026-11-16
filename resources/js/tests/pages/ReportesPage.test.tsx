import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ReportesPage from '../../pages/ReportesPage';
import { renderPagina } from '../harness';
import { router } from '../mocks/inertia';

const reportes = {
    filtros: {
        desde: '2026-10-11',
        hasta: '2026-11-09',
        obra_id: null,
        almacen_id: null,
        categoria_id: null,
    },
    indicadores: {
        valor_inventario: 89963,
        stock_critico: 1,
        skus: 12,
        unidades: 1785,
        mermas_registros: 2,
        mermas_cantidad: 4.5,
        mermas_valor: 195,
        ingresos: 100,
        salidas: 80,
        movimientos: 20,
        rotacion: 1.7,
        cumplimiento: 50,
        transferencias: 2,
        compras: 35750,
        obras_activas: 2,
        avance_promedio: 55.3,
    },
    serie: [
        {
            fecha: '2026-10-11',
            etiqueta: '11 oct',
            ingreso: 10,
            salida: 5,
        },
        {
            fecha: '2026-10-12',
            etiqueta: '12 oct',
            ingreso: 12,
            salida: 7,
        },
    ],
    categorias: [{ categoria: 'Agregados', valor: 45000, skus: 3 }],
    materiales: [
        {
            id: '1',
            material: 'Cemento Andino',
            codigo: 'MAT-CEM-01',
            almacen: 'Almacén Central',
            movimientos: 120,
            salidas: 60,
            stock: 250,
            valor: 0,
        },
    ],
    generado_en: '2026-11-09T20:00:00Z',
};

const catalogos = {
    obras: [{ id: 1, codigo: 'OBR-1', nombre: 'Obra Uno' }],
    almacenes: [
        { id: 1, codigo: 'ALM-1', nombre: 'Almacén Uno', obra_id: 1 },
    ],
    categorias: [{ id: 1, nombre: 'Agregados' }],
};

function renderizar() {
    return renderPagina(ReportesPage, {
        reportes,
        filtros: reportes.filtros,
        catalogos,
    });
}

describe('pages/ReportesPage', () => {
    it('muestra indicadores, gráficos, tabla e impacto con datos reales', () => {
        renderizar();

        expect(screen.getByText('Reportes e Indicadores')).toBeTruthy();
        expect(screen.getByText('Valor del inventario')).toBeTruthy();
        expect(screen.getByText('Stock crítico')).toBeTruthy();
        expect(screen.getByText('Mermas del período')).toBeTruthy();
        expect(screen.getByText('Cumplimiento de transferencias')).toBeTruthy();
        expect(screen.getAllByText('Cemento Andino').length).toBeGreaterThan(0);
        expect(screen.getByText('Impacto funcional')).toBeTruthy();
    });

    it('aplica filtros de fecha, obra, almacén y categoría', () => {
        renderizar();

        fireEvent.change(screen.getByLabelText('Obra'), {
            target: { value: '1' },
        });
        fireEvent.change(screen.getByLabelText('Almacén'), {
            target: { value: '1' },
        });
        fireEvent.change(screen.getByLabelText('Categoría'), {
            target: { value: '1' },
        });
        fireEvent.click(screen.getByRole('button', { name: /Aplicar/ }));

        expect(router.get).toHaveBeenCalledWith(
            '/reportes',
            expect.objectContaining({
                obra_id: '1',
                almacen_id: '1',
                categoria_id: '1',
            }),
            expect.objectContaining({ preserveState: true }),
        );
    });

    it('limpia los filtros y exporta la tabla a CSV', () => {
        renderizar();

        fireEvent.click(screen.getByRole('button', { name: /Limpiar/ }));
        expect(router.get).toHaveBeenCalledWith(
            '/reportes',
            {},
            expect.objectContaining({ preserveState: true }),
        );

        fireEvent.click(
            screen.getByRole('button', { name: /Exportar CSV/ }),
        );
        expect(screen.getByText('Reporte exportado en CSV.')).toBeTruthy();
    });

    it('muestra el estado vacío cuando no hay materiales', () => {
        renderPagina(ReportesPage, {
            reportes: { ...reportes, materiales: [] },
            filtros: reportes.filtros,
            catalogos,
        });

        expect(
            screen.getByText('No hay movimientos de materiales para los filtros.'),
        ).toBeTruthy();
    });
});
