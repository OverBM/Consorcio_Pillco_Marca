import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    NotificationProvider,
    useNotifications,
    type NotifyApi,
} from '../../components/notifications/NotificationProvider';
import { ApiError } from '../../services/http/client';

function BotonAccion({
    accion,
    children,
}: {
    accion: (api: NotifyApi) => unknown;
    children: string;
}) {
    const api = useNotifications();

    return <button onClick={() => accion(api)}>{children}</button>;
}

function renderCon(accion: (api: NotifyApi) => unknown, texto = 'disparar') {
    return render(
        <NotificationProvider>
            <BotonAccion accion={accion}>{texto}</BotonAccion>
        </NotificationProvider>,
    );
}

describe('components/NotificationProvider', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('lanza un error si se usa fuera del proveedor', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

        expect(() =>
            render(<BotonAccion accion={() => {}}>fuera</BotonAccion>),
        ).toThrow('useNotifications debe usarse dentro');

        spy.mockRestore();
    });

    it('muestra notificaciones de éxito con título', () => {
        renderCon((api) => api.success('Guardado', { title: 'Éxito' }));

        fireEvent.click(screen.getByText('disparar'));

        expect(screen.getByText('Guardado')).toBeTruthy();
        expect(screen.getByText('Éxito')).toBeTruthy();
        expect(screen.getByRole('status')).toBeTruthy();
    });

    it('muestra notificaciones de error e info', () => {
        renderCon((api) => api.error('Falló'));
        fireEvent.click(screen.getByText('disparar'));
        expect(screen.getByText('Falló')).toBeTruthy();

        renderCon((api) => api.info('Dato'), 'info');
        fireEvent.click(screen.getByText('info'));

        expect(screen.getByText('Dato')).toBeTruthy();
    });

    it('une los errores de campos de un ApiError', () => {
        renderCon((api) =>
            api.apiError(
                new ApiError('Validación', 422, {
                    nombre: ['Requerido'],
                    cantidad: ['Debe ser mayor'],
                }),
            ),
        );

        fireEvent.click(screen.getByText('disparar'));

        expect(screen.getByText('Requerido Debe ser mayor')).toBeTruthy();
    });

    it('usa el mensaje del ApiError cuando no hay errores de campos', () => {
        renderCon((api) => api.apiError(new ApiError('Servidor caído', 500)));

        fireEvent.click(screen.getByText('disparar'));

        expect(screen.getByText('Servidor caído')).toBeTruthy();
    });

    it('usa el mensaje de un Error común', () => {
        renderCon((api) => api.apiError(new Error('Boom')));

        fireEvent.click(screen.getByText('disparar'));

        expect(screen.getByText('Boom')).toBeTruthy();
    });

    it('usa el mensaje de respaldo para errores desconocidos', () => {
        renderCon((api) => api.apiError('raro'));

        fireEvent.click(screen.getByText('disparar'));

        expect(screen.getByText('Ocurrió un error inesperado.')).toBeTruthy();
    });

    it('acepta un mensaje de respaldo personalizado', () => {
        renderCon((api) => api.apiError(null, 'Fallback propio'));

        fireEvent.click(screen.getByText('disparar'));

        expect(screen.getByText('Fallback propio')).toBeTruthy();
    });

    it('descarta la notificación con el botón de cierre', () => {
        renderCon((api) => api.success('Descartable'));

        fireEvent.click(screen.getByText('disparar'));
        expect(screen.getByText('Descartable')).toBeTruthy();

        fireEvent.click(screen.getByLabelText('Cerrar notificación'));

        expect(screen.queryByText('Descartable')).toBeNull();
    });

    it('cierra la notificación automáticamente', () => {
        vi.useFakeTimers();
        renderCon((api) => api.success('Temporal'));

        fireEvent.click(screen.getByText('disparar'));
        expect(screen.getByText('Temporal')).toBeTruthy();

        act(() => {
            vi.advanceTimersByTime(4500);
        });

        expect(screen.queryByText('Temporal')).toBeNull();
    });

    it('respeta la duración cero sin autocierre', () => {
        vi.useFakeTimers();
        renderCon((api) => api.info('Persistente', { duration: 0 }));

        fireEvent.click(screen.getByText('disparar'));

        act(() => {
            vi.advanceTimersByTime(10000);
        });

        expect(screen.getByText('Persistente')).toBeTruthy();
    });

    it('descarta la notificación antes de que venza el temporizador', () => {
        vi.useFakeTimers();
        renderCon((api) => api.success('Manual', { duration: 5000 }));

        fireEvent.click(screen.getByText('disparar'));
        fireEvent.click(screen.getByLabelText('Cerrar notificación'));

        act(() => {
            vi.advanceTimersByTime(5000);
        });

        expect(screen.queryByText('Manual')).toBeNull();
    });
});
