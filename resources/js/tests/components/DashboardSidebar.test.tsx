import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
    DashboardSidebar,
    type NavGroup,
} from '../../design-system/DashboardSidebar';

const grupos: NavGroup[] = [
    {
        title: 'Principal',
        items: [
            { id: 'panel', label: 'Panel', href: '/panel', icon: 'dashboard' },
            { id: 'obra', label: 'Obra', href: '/obra', icon: 'building' },
            {
                id: 'redist',
                label: 'Redistribución',
                href: '/redistribucion',
                icon: 'refresh',
                badge: 'ACTIVO',
                tone: 'mint',
            },
            {
                id: 'doc',
                label: 'Documentos',
                href: '/doc',
                icon: 'file',
                badge: '3',
                tone: 'yellow',
            },
            {
                id: 'stock',
                label: 'Stock',
                href: '/stock',
                icon: 'box',
                badge: '12',
            },
        ],
    },
    {
        title: 'Logística',
        items: [
            { id: 'evm', label: 'EVM', href: '/evm', icon: 'trending-up' },
            { id: 'costos', label: 'Costos', href: '/costos', icon: 'dollar' },
            {
                id: 'riesgos',
                label: 'Riesgos',
                href: '/riesgos',
                icon: 'alert',
            },
            { id: 'cambios', label: 'Cambios', href: '/cambios', icon: 'edit' },
            { id: 'cierre', label: 'Cierre', href: '/cierre', icon: 'flag' },
            {
                id: 'recepcion',
                label: 'Recepción',
                href: '/recepcion',
                icon: 'inbox',
            },
            {
                id: 'solicitudes',
                label: 'Solicitudes',
                href: '/solicitudes',
                icon: 'clipboard',
            },
            {
                id: 'despachos',
                label: 'Despachos',
                href: '/despachos',
                icon: 'truck',
            },
            {
                id: 'devoluciones',
                label: 'Devoluciones',
                href: '/devoluciones',
                icon: 'repeat',
            },
            {
                id: 'inventario',
                label: 'Inventario',
                href: '/inventario',
                icon: 'search',
            },
            {
                id: 'mermas',
                label: 'Mermas',
                href: '/mermas',
                icon: 'trending-down',
            },
            {
                id: 'compras',
                label: 'Compras',
                href: '/compras',
                icon: 'shopping-cart',
            },
            {
                id: 'cotizaciones',
                label: 'Cotizaciones',
                href: '/cotizaciones',
                icon: 'scale',
            },
            {
                id: 'ordenes',
                label: 'Órdenes',
                href: '/ordenes',
                icon: 'file-check',
            },
            {
                id: 'usuarios',
                label: 'Usuarios',
                href: '/usuarios',
                icon: 'users',
            },
            {
                id: 'asistencia',
                label: 'Asistencia',
                href: '/asistencia',
                icon: 'map-pin',
            },
            { id: 'epp', label: 'EPP', href: '/epp', icon: 'shield' },
            {
                id: 'parametros',
                label: 'Parámetros',
                href: '/parametros',
                icon: 'settings',
            },
            { id: 'sin-icono', label: 'Sin icono', href: '/sin-icono' },
        ],
    },
];

describe('design-system/DashboardSidebar', () => {
    it('renderiza marca, grupos, badges y el módulo activo', () => {
        const { container } = render(
            <DashboardSidebar
                groups={grupos}
                activeRoute="/stock"
                className="personalizado"
            />,
        );

        expect(screen.getByText('Consorcio Pillco Marca')).toBeTruthy();
        expect(screen.getByText('Valle del Mantaro')).toBeTruthy();
        expect(screen.getByText('SISTEMA ACTIVO')).toBeTruthy();
        expect(screen.getByText('HUANCAYO')).toBeTruthy();
        expect(screen.getByText('Principal')).toBeTruthy();
        expect(screen.getByText('Logística')).toBeTruthy();
        expect(screen.getByText('ACTIVO')).toBeTruthy();
        expect(container.querySelector('.personalizado')).toBeTruthy();

        const activo = screen
            .getByText('Stock')
            .closest('a') as HTMLAnchorElement;

        expect(activo.className).toContain('bg-[#d1ffca]');
    });

    it('renderiza colapsado con iconos y etiquetas accesibles', () => {
        render(
            <DashboardSidebar
                groups={grupos}
                collapsed
                rolNombre="Residente de Obra"
            />,
        );

        expect(screen.queryByText('Consorcio Pillco Marca')).toBeNull();
        expect(screen.queryByText('SISTEMA ACTIVO')).toBeNull();
        expect(screen.getByText('R')).toBeTruthy();
        expect(screen.getByLabelText('Panel')).toBeTruthy();
        expect(screen.queryByText('ACTIVO')).toBeNull();
    });

    it('invoca onToggleCollapse y onNavigate', () => {
        const onToggleCollapse = vi.fn();
        const onNavigate = vi.fn();

        render(
            <DashboardSidebar
                groups={grupos}
                onToggleCollapse={onToggleCollapse}
                onNavigate={onNavigate}
            />,
        );

        fireEvent.click(screen.getByLabelText('Contraer menú lateral'));
        fireEvent.click(screen.getByText('Panel'));

        expect(onToggleCollapse).toHaveBeenCalledOnce();
        expect(onNavigate).toHaveBeenCalledOnce();
    });

    it('cambia la etiqueta del botón cuando está colapsado', () => {
        const onToggleCollapse = vi.fn();

        render(
            <DashboardSidebar
                groups={grupos}
                collapsed
                onToggleCollapse={onToggleCollapse}
            />,
        );

        const boton = screen.getByLabelText('Expandir menú lateral');

        fireEvent.click(boton);

        expect(onToggleCollapse).toHaveBeenCalledOnce();
    });

    it('omite el botón de colapso y el pie cuando no hay callback', () => {
        const { container } = render(<DashboardSidebar groups={grupos} />);

        expect(screen.queryByLabelText('Contraer menú lateral')).toBeNull();
        expect(screen.getByText('SICAAO · V3.0')).toBeTruthy();
        expect(container.querySelector('nav')).toBeTruthy();
    });
});
