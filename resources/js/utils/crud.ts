import type { NotifyApi } from '../components/notifications/NotificationProvider';

type ErroresApi = Record<string, string>;

export interface OpcionesHttp {
    onSuccess: () => void;
    onError: (errors: ErroresApi) => void;
}

export function opcionesHttp(
    notify: NotifyApi,
    mensajeExito: string,
    fallbackError: string,
    alExito: () => void,
    refrescar: () => void,
): OpcionesHttp {
    return {
        onSuccess: () => {
            notify.success(mensajeExito);
            alExito();
            refrescar();
        },
        onError: (errors) =>
            notify.error(
                Object.values(errors).flat().join(' ') || fallbackError,
            ),
    };
}
