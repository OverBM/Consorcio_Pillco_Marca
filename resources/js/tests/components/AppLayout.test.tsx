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
        expect(screen.getByText('Consorcio Pillco Marca')).toBeTruthy();
        expect(screen.getAllByText('Panel General')[0]).toBeTruthy();
        expect(
            screen.getByText(/OBRA: Mejoramiento Vía Huancayo/),
        ).toBeTruthy();
    });

    it('resuelve el título desde la ruta actual', () => {
        setPageProps(props(), '/perfil');
        renderLayout();

        expect(screen.getAllByText('Mi Perfil')[0]).toBeTruthy();
    });

    it('usa la primera obra cuando la activa no existe', () => {
        setPageProps(
            props({
                contexto: { obra_activa_id: 999, almacen_activo_id: null },
            }),
            '/panel',
        );
        renderLayout();

        expect(
            screen.getByText(/OBRA: Mejoramiento Vía Huancayo/),
        ).toBeTruthy();
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

        fireEvent.click(screen.getByText(/OBRA:/).closest('button') as Element);
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

        expect(screen.getByText(/Sin asignar/)).toBeTruthy();

        fireEvent.click(screen.getByText(/OBRA:/).closest('button') as Element);

        expect(screen.getByText('No tiene obras asignadas.')).toBeTruthy();
    });

    it('abre y cierra el drawer móvil con botón, overlay y Escape', () => {
        setPageProps(props(), '/panel');
        const { container } = renderLayout();

        fireEvent.click(screen.getByLabelText('Abrir menú de navegación'));

        const overlay = screen.getByLabelText('Cerrar menú de navegación');

        expect(overlay).toBeTruthy();

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(screen.queryByLabelText('Cerrar menú de navegación')).toBeNull();

        fireEvent.click(screen.getByLabelText('Abrir menú de navegación'));
        fireEvent.click(screen.getByLabelText('Cerrar menú de navegación'));

        expect(screen.queryByLabelText('Cerrar menú de navegación')).toBeNull();
        expect(container.querySelector('.lg\\:sticky')).toBeTruthy();
    });

    it('cierra la sesión por el botón del header', () => {
        setPageProps(props(), '/panel');
        renderLayout();

        fireEvent.click(screen.getByLabelText('Cerrar sesión'));

        expect(router.post).toHaveBeenCalledWith('/logout');
    });

    it('colapsa el menú y guarda la preferencia', () => {
        setPageProps(props(), '/panel');
        renderLayout();

        fireEvent.click(screen.getByLabelText('Contraer menú lateral'));

        expect(window.localStorage.getItem('cicaao.sidebar.collapsed')).toBe(
            '1',
        );
        expect(screen.getByLabelText('Expandir menú lateral')).toBeTruthy();
    });

    it('inicia colapsado si hay preferencia guardada', () => {
        window.localStorage.setItem('cicaao.sidebar.collapsed', '1');
        setPageProps(props(), '/panel');
        renderLayout();

        expect(screen.getByLabelText('Expandir menú lateral')).toBeTruthy();
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
        expect(screen.getByText(/Sin asignar/)).toBeTruthy();
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

        expect(screen.getAllByText('Rol X')[0]).toBeTruthy();
        expect(screen.getByText('JP')).toBeTruthy();
    });
});
