import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HeaderBar } from '../../design-system/HeaderBar';
import type {
    NotificacionFeedItem,
    NotificacionesFeed,
} from '../../types/auth';
import { renderPagina } from '../harness';
import { llamadasHttp, router, setPageProps } from '../mocks/inertia';

function item(
    overrides: Partial<NotificacionFeedItem> & { id: string },
): NotificacionFeedItem {
    return {
        origen: 'notificacion',
        tipo: 'general',
        titulo: 'Título',
        cuerpo: null,
        severidad: null,
        referencia_tipo: null,
        referencia_id: null,
        leida: false,
        fecha: null,
        ...overrides,
    };
}

const feed: NotificacionesFeed = {
    items: [
        item({
            id: 'notificacion-7',
            titulo: 'Stock bajo',
            cuerpo: 'Cuerpo del aviso',
            severidad: 'alta',
            referencia_tipo: 'material',
            referencia_id: 1,
            fecha: '2026-01-15T10:00:00.000Z',
        }),
        item({
            id: 'alerta-3',
            origen: 'alerta',
            titulo: 'Alerta crítica',
            leida: true,
        }),
        item({
            id: 'notificacion-8',
            tipo: 'excedente_detectado',
            titulo: 'Excedente detectado',
        }),
        item({
            id: 'notificacion-9',
            titulo: 'Excedente',
            referencia_tipo: 'excedente',
            leida: true,
        }),
        item({ id: 'notificacion-10', referencia_tipo: 'requerimiento' }),
        item({ id: 'notificacion-11', referencia_tipo: 'transferencia' }),
        item({ id: 'notificacion-12', referencia_tipo: 'stock_almacen' }),
        item({ id: 'notificacion-13', referencia_tipo: 'solicitud_acceso' }),
        item({ id: 'notificacion-14', referencia_tipo: 'obra' }),
        item({
            id: 'alerta-4',
            origen: 'alerta',
            titulo: 'Fecha inválida',
            leida: true,
            fecha: 'fecha-invalida',
        }),
        item({ id: 'notificacion-15', titulo: 'Aviso sin destino' }),
        item({
            id: 'alerta-16',
            origen: 'alerta',
            titulo: 'Alerta sin destino',
        }),
    ],
    sin_leer: 150,
};

function abrirPanel(): void {
    fireEvent.click(screen.getByRole('button', { name: /^Notificaciones/ }));
}

describe('design-system/HeaderBar', () => {
    beforeEach(() => {
        setPageProps({ notificacionesFeed: feed });
    });

    it('muestra migas, entorno, usuario y contador recortado', () => {
        renderPagina(HeaderBar, {
            title: 'Mi Panel',
            subtitle: 'Subtítulo',
            onMenuClick: vi.fn(),
            onLogout: vi.fn(),
            actions: <span>Acción</span>,
        });

        expect(screen.getAllByText('PANEL')[0]).toBeTruthy();
        expect(screen.getAllByText('OPERACIONES')[0]).toBeTruthy();
        expect(screen.getAllByText('VALLE DEL MANTARO')[0]).toBeTruthy();
        expect(screen.getAllByText('Mi Panel')[0]).toBeTruthy();
        expect(screen.getByText('Subtítulo')).toBeTruthy();
        expect(screen.getByText('Acción')).toBeTruthy();
        expect(screen.getByText('HUANCAYO · EN LÍNEA')).toBeTruthy();
        expect(screen.getByText('Residente de Obra')).toBeTruthy();
        expect(screen.getByText('RO')).toBeTruthy();
        expect(screen.getByText('99+')).toBeTruthy();
    });

    it('oculta el contador cuando no hay pendientes', () => {
        renderPagina(HeaderBar, { title: 'Sin avisos', notificationCount: 0 });

        const campana = screen.getByRole('button', {
            name: /^Notificaciones/,
        });

        expect(campana.getAttribute('aria-label')).toBe('Notificaciones');
        expect(screen.queryByText('99+')).toBeNull();
    });

    it('omite breadcrumb, subtítulo y acciones por defecto', () => {
        renderPagina(HeaderBar, { title: 'Solo' });

        expect(screen.queryByText('Acción')).toBeNull();
        expect(screen.queryByLabelText('Abrir menú de navegación')).toBeNull();
        expect(screen.queryByLabelText('Cerrar sesión')).toBeNull();
    });

    it('invoca los callbacks de menú, notificaciones y sesión', () => {
        const onMenuClick = vi.fn();
        const onNotificationClick = vi.fn();
        const onLogout = vi.fn();

        renderPagina(HeaderBar, {
            title: 'Acciones',
            onMenuClick,
            onNotificationClick,
            onLogout,
        });

        fireEvent.click(screen.getByLabelText('Abrir menú de navegación'));
        fireEvent.click(
            screen.getByRole('button', { name: /^Notificaciones/ }),
        );
        fireEvent.click(screen.getByLabelText('Cerrar sesión'));

        expect(onMenuClick).toHaveBeenCalledOnce();
        expect(onNotificationClick).toHaveBeenCalledOnce();
        expect(onLogout).toHaveBeenCalledOnce();
    });

    it('abre el panel vacío y deshabilita marcar todas', () => {
        setPageProps({});
        renderPagina(HeaderBar, { title: 'Vacío' });

        abrirPanel();

        expect(
            screen.getByText('No tienes notificaciones ni alertas pendientes.'),
        ).toBeTruthy();

        const marcarTodas = screen.getByText('Marcar todas como leídas');

        expect((marcarTodas as HTMLButtonElement).disabled).toBe(true);
    });

    it('marca todas como leídas y refresca el feed', () => {
        renderPagina(HeaderBar, { title: 'Marcar' });

        abrirPanel();
        fireEvent.click(screen.getByText('Marcar todas como leídas'));

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/notificaciones/marcar-todas',
            }),
        );
        expect(router.reload).toHaveBeenCalledWith({
            only: ['notificacionesFeed'],
        });
    });

    it('abre una notificación no leída marcándola y navega', () => {
        renderPagina(HeaderBar, { title: 'Item' });

        abrirPanel();
        fireEvent.click(screen.getByText('Stock bajo'));

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/notificaciones/7/marcar-leida',
            }),
        );
        expect(router.visit).toHaveBeenCalledWith('/stock');
    });

    it('navega directo si la notificación ya fue leída', () => {
        renderPagina(HeaderBar, { title: 'Leída' });

        abrirPanel();
        fireEvent.click(screen.getByText('Excedente'));

        expect(router.visit).toHaveBeenCalledWith('/programa/redistribucion');
        expect(llamadasHttp).toHaveLength(0);
    });

    it('marca items sin destino según su origen', () => {
        renderPagina(HeaderBar, { title: 'Sin destino' });

        abrirPanel();
        fireEvent.click(screen.getByText('Aviso sin destino'));
        fireEvent.click(screen.getByText('Alerta sin destino'));

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                url: '/api/v1/notificaciones/15/marcar-leida',
            }),
        );
        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                url: '/api/v1/alertas/16/marcar-leida',
            }),
        );
    });

    it('cierra el panel con Escape y con el overlay', () => {
        renderPagina(HeaderBar, { title: 'Cierre' });

        abrirPanel();
        expect(
            screen.getByRole('dialog', {
                name: 'Notificaciones y alertas',
            }),
        ).toBeTruthy();

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(screen.queryByRole('dialog')).toBeNull();

        abrirPanel();
        fireEvent.click(screen.getByLabelText('Cerrar notificaciones'));
        expect(screen.queryByRole('dialog')).toBeNull();
    });
});
