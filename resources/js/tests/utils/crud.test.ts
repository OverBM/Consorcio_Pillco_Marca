import { describe, expect, it, vi } from 'vitest';

import type { NotifyApi } from '../../components/notifications/NotificationProvider';
import { opcionesHttp } from '../../utils/crud';

function notificacionesFalsas(): NotifyApi {
    return {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        apiError: vi.fn(),
        dismiss: vi.fn(),
    } as unknown as NotifyApi;
}

describe('utils/crud', () => {
    it('notifica, refresca y ejecuta el callback de éxito', () => {
        const notify = notificacionesFalsas();
        const alExito = vi.fn();
        const refrescar = vi.fn();

        const opciones = opcionesHttp(
            notify,
            'Registro creado',
            'Error inesperado',
            alExito,
            refrescar,
        );

        opciones.onSuccess();

        expect(notify.success).toHaveBeenCalledWith('Registro creado');
        expect(alExito).toHaveBeenCalledOnce();
        expect(refrescar).toHaveBeenCalledOnce();
    });

    it('une los mensajes de error del backend', () => {
        const notify = notificacionesFalsas();

        const opciones = opcionesHttp(
            notify,
            'ok',
            'Fallback',
            vi.fn(),
            vi.fn(),
        );

        opciones.onError({ nombre: 'Requerido', cantidad: 'Debe ser mayor' });

        expect(notify.error).toHaveBeenCalledWith('Requerido Debe ser mayor');
    });

    it('usa el mensaje de respaldo cuando no hay errores', () => {
        const notify = notificacionesFalsas();

        opcionesHttp(notify, 'ok', 'Fallback', vi.fn(), vi.fn()).onError({});

        expect(notify.error).toHaveBeenCalledWith('Fallback');
    });
});
