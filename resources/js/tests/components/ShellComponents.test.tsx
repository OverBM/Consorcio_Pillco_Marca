import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
    DataSection,
    KpiRow,
    PageShell,
    SplitGrid,
} from '../../design-system/PageShell';
import { SegmentedTabs } from '../../design-system/SegmentedTabs';
import { ModulePills, SubmodulePills } from '../../design-system/TopPills';

const GRUPOS = [
    {
        title: 'Panel Principal',
        items: [
            { id: 'panel-general', label: 'Panel General', href: '/panel' },
            { id: 'mi-perfil', label: 'Mi Perfil', href: '/perfil' },
        ],
    },
    {
        title: 'Almacén y Logística',
        items: [
            { id: 'matriz-stock', label: 'Matriz de Stock', href: '/stock' },
            {
                id: 'recepcion-obra',
                label: 'Recepción de Obra',
                href: '/recepcion',
            },
        ],
    },
    {
        title: 'Administración',
        items: [
            {
                id: 'usuarios-roles',
                label: 'Usuarios y Accesos',
                href: '/admin/usuarios',
            },
        ],
    },
];

describe('design-system/TopPills', () => {
    it('muestra un pill por módulo y excluye administración', () => {
        render(<ModulePills grupos={GRUPOS} pathname="/panel" />);

        expect(screen.getByText('Panel')).toBeTruthy();
        expect(screen.getByText('Almacén')).toBeTruthy();
        expect(screen.queryByText('Administración')).toBeNull();
    });

    it('marca el módulo activo', () => {
        render(<ModulePills grupos={GRUPOS} pathname="/stock" />);

        const activo = screen.getByRole('link', { name: /Almacén/ });

        expect(activo.getAttribute('aria-current')).toBe('page');
    });

    it('lista los submódulos del módulo activo', () => {
        render(<SubmodulePills grupos={GRUPOS} pathname="/stock" />);

        expect(screen.getByText('Matriz de Stock')).toBeTruthy();
        expect(screen.getByText('Recepción de Obra')).toBeTruthy();
    });

    it('no muestra submódulos cuando el grupo tiene uno solo', () => {
        render(
            <SubmodulePills
                grupos={[
                    {
                        title: 'Panel Principal',
                        items: [
                            {
                                id: 'panel-general',
                                label: 'Panel General',
                                href: '/panel',
                            },
                        ],
                    },
                ]}
                pathname="/panel"
            />,
        );

        expect(
            screen.queryByRole('navigation', { name: 'Submódulos' }),
        ).toBeNull();
    });

    it('muestra cuántos módulos tiene cada grupo', () => {
        render(<ModulePills grupos={GRUPOS} pathname="/panel" />);

        const almacen = screen.getByRole('link', { name: /Almacén/ });

        expect(almacen.textContent).toContain('2');
    });

    it('no marca ningún módulo cuando la ruta es de administración', () => {
        render(<ModulePills grupos={GRUPOS} pathname="/admin/usuarios" />);

        expect(screen.queryAllByRole('link', { current: 'page' })).toHaveLength(
            0,
        );
    });
});

describe('design-system/SegmentedTabs', () => {
    it('cambia de vista al presionar un tab', () => {
        let activo = 'a';

        render(
            <SegmentedTabs
                opciones={[
                    { id: 'a', label: 'Primera' },
                    { id: 'b', label: 'Segunda' },
                ]}
                activo={activo}
                onChange={(id) => {
                    activo = id;
                }}
                etiqueta="Vistas"
            />,
        );

        expect(
            screen
                .getByRole('tab', { name: 'Primera' })
                .getAttribute('aria-selected'),
        ).toBe('true');

        fireEvent.click(screen.getByRole('tab', { name: 'Segunda' }));

        expect(activo).toBe('b');
    });
});

describe('design-system/PageShell', () => {
    it('renderiza encabezado, ruta, estado y contenido', () => {
        render(
            <PageShell
                title="Matriz de Stock"
                subtitle="Inventario por almacén"
                breadcrumb={['Almacén', 'Matriz de Stock']}
                estado={{ label: '3 críticos', tone: 'critico' }}
                actions={<button type="button">Exportar</button>}
            >
                <p>Contenido</p>
            </PageShell>,
        );

        expect(screen.getAllByText('Matriz de Stock').length).toBeGreaterThan(
            0,
        );
        expect(screen.getByText('Inventario por almacén')).toBeTruthy();
        expect(screen.getByText('3 críticos')).toBeTruthy();
        expect(screen.getByText('Exportar')).toBeTruthy();
        expect(screen.getByText('Contenido')).toBeTruthy();
        expect(
            screen.getByRole('navigation', { name: 'Ruta de navegación' }),
        ).toBeTruthy();
    });

    it('muestra el estado vacío de DataSection', () => {
        render(
            <DataSection title="Alertas" vacio mensajeVacio="Sin alertas">
                <p>No debería verse</p>
            </DataSection>,
        );

        expect(screen.getByText('Sin alertas')).toBeTruthy();
        expect(screen.queryByText('No debería verse')).toBeNull();
    });

    it('compone la grilla principal y lateral', () => {
        render(
            <SplitGrid
                principal={
                    <KpiRow>
                        <p>Tarjeta</p>
                    </KpiRow>
                }
                lateral={<p>Lateral</p>}
            />,
        );

        expect(screen.getByText('Tarjeta')).toBeTruthy();
        expect(screen.getByText('Lateral')).toBeTruthy();
    });
});
