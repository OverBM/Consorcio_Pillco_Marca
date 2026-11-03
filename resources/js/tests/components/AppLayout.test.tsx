import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { AppLayout } from '../../components/layout/AppLayout';
import {
    authFixture,
    catalogosFixture,
    contextoFixture,
    notificacionesFixture,
} from '../fixtures';
import { renderPagina } from '../harness';
import { router, setPageProps } from '../mocks/inertia';

function props(
    overrides: Record<string, unknown> = {},
): Record<string, unknown> {
    return {
        auth: authFixture,
        catalogos: catalogosFixture,
        contexto: contextoFixture,
        notificacionesFeed: notificacionesFixture,
        ...overrides,
    };
}

function renderLayout() {
    return renderPagina(AppLayout, { children: <p>Contenido de la página</p> });
}

describe('components/layout/AppLayout', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it('renderiza el contenido, la marca y la obra activa', () => {
        setPageProps(props(), '/panel');
        renderLayout();

        expect(screen.getByText('Contenido de la página')).toBeTruthy();
        expect(screen.getAllByText('Consorcio Pillco Marca')[0]).toBeTruthy();
        expect(screen.getAllByText('Panel General')[0]).toBeTruthy();
        expect(
            screen.getByText(/Mejoramiento Vía Huancayo/),
        ).toBeTruthy();
    });

    it('resuelve el título desde la ruta actual', () => {
        setPageProps(props(), '/perfil');
        renderLayout();

        expect(screen.getAllByText('Mi Perfil')[0]).toBeTruthy();
    });

    it('muestra "Todas las obras" cuando la activa no existe', () => {
        setPageProps(
            props({
                contexto: { obra_activa_id: 999, almacen_activo_id: null },
            }),
            '/panel',
        );
        renderLayout();

        expect(screen.getByText(/Todas las obras/)).toBeTruthy();
    });

    it('permite volver a "Todas las obras"', () => {
        setPageProps(
            props({
                contexto: {
                    obra_activa_id: catalogosFixture.obras[0].id,
                    almacen_activo_id: null,
                },
            }),
            '/panel',
        );
        renderLayout();

        fireEvent.click(
            screen
                .getByText(/Mejoramiento Vía Huancayo/)
                .closest('button') as Element,
        );
        fireEvent.click(screen.getByText('Todas las obras'));

        expect(router.post).toHaveBeenCalledWith(
            '/contexto',
            { obra_activa_id: null },
            { preserveScroll: true, preserveState: true },
        );
    });

    it('permite cambiar de obra desde el menú', () => {
        const catalogos = {
            ...catalogosFixture,
            obras: [
                catalogosFixture.obras[0],
                {
                    id: 2,
                    codigo: 'OB-02',
                    nombre: 'Obra Frente 2',
                    distrito: 'Huancayo',
                    estado: 'activa',
                    avance_fisico_pct: 10,
                },
            ],
        };

        setPageProps(props({ catalogos }), '/panel');
        renderLayout();

        fireEvent.click(screen.getByText(/Mejoramiento Vía Huancayo|Sin asignar/).closest('button') as Element);
        expect(screen.getByText('Seleccionar Frente / Obra')).toBeTruthy();

        fireEvent.click(screen.getByText('Obra Frente 2'));

        expect(router.post).toHaveBeenCalledWith(
            '/contexto',
            { obra_activa_id: 2 },
            { preserveScroll: true, preserveState: true },
        );
        expect(screen.queryByText('Seleccionar Frente / Obra')).toBeNull();
    });

    it('informa cuando no hay obras asignadas', () => {
        setPageProps(
            props({ catalogos: { ...catalogosFixture, obras: [] } }),
            '/panel',
        );
        renderLayout();

        expect(screen.getByText(/Todas las obras/)).toBeTruthy();

        fireEvent.click(
            screen.getByText(/Todas las obras/).closest('button') as Element,
        );

        expect(screen.getByText('No tiene obras asignadas.')).toBeTruthy();
    });

    it('cierra la sesión por el botón del header', () => {
        setPageProps(props(), '/panel');
        renderLayout();

        fireEvent.click(screen.getByLabelText('Cerrar sesión'));

        expect(router.post).toHaveBeenCalledWith('/logout');
    });

    it('tolera la ausencia de usuario autenticado', () => {
        setPageProps(
            props({
                auth: { user: null },
                catalogos: { ...catalogosFixture, obras: [] },
            }),
            '/panel',
        );
        renderLayout();

        expect(screen.getAllByText('Usuario')[0]).toBeTruthy();
        expect(screen.getAllByText(/Todas las obras/)[0]).toBeTruthy();
    });

    it('usa el nombre del rol cuando no está en el catálogo', () => {
        setPageProps(
            props({
                auth: {
                    user: {
                        ...authFixture.user,
                        name: 'Juan Pérez',
                        roles: [{ codigo: 'rol_desconocido', nombre: 'Rol X' }],
                    },
                },
            }),
            '/panel',
        );
        renderLayout();

        fireEvent.click(
            screen.getByRole('button', { name: 'Cuenta de Juan Pérez' }),
        );

        expect(screen.getAllByText(/Rol X/)[0]).toBeTruthy();
        expect(screen.getByText('JP')).toBeTruthy();
    });

    it('muestra la navegación de módulos y submódulos', () => {
        setPageProps(props(), '/panel');
        renderLayout();

        expect(
            screen.getByRole('navigation', { name: 'Módulos' }),
        ).toBeTruthy();
        expect(
            screen.getByRole('navigation', { name: 'Submódulos' }),
        ).toBeTruthy();
        expect(screen.getByLabelText('Buscar')).toBeTruthy();
    });

    it('ya no renderiza el sidebar anterior', () => {
        setPageProps(props(), '/panel');
        renderLayout();

        expect(screen.queryByLabelText('Contraer menú lateral')).toBeNull();
        expect(screen.queryByLabelText('Abrir menú de navegación')).toBeNull();
    });

    it('abre la búsqueda global con Ctrl+K', () => {
        setPageProps(props(), '/panel');
        renderLayout();

        fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

        expect(
            screen.getByRole('dialog', { name: 'Búsqueda global' }),
        ).toBeTruthy();
    });
});
