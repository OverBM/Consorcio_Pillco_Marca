import { useCallback, useEffect, useState } from 'react';
import { contarPendientes, sincronizarCola } from '../utils/offlineQueue';

export function useOfflineQueue() {
    const [online, setOnline] = useState(
        typeof navigator === 'undefined' ? true : navigator.onLine,
    );
    const [pendientes, setPendientes] = useState(0);
    const [sincronizando, setSincronizando] = useState(false);

    const refrescar = useCallback(async () => {
        setPendientes(await contarPendientes());
    }, []);

    const sincronizar = useCallback(async () => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            return;
        }

        setSincronizando(true);

        try {
            await sincronizarCola();
        } finally {
            await refrescar();
            setSincronizando(false);
        }
    }, [refrescar]);

    useEffect(() => {
        void refrescar();

        const alVolver = () => {
            setOnline(true);
            void sincronizar();
        };
        const alPerder = () => setOnline(false);

        const alMensaje = (evento: MessageEvent) => {
            if (evento.data?.type === 'obraflow:sincronizar') {
                void sincronizar();
            }
        };

        window.addEventListener('online', alVolver);
        window.addEventListener('offline', alPerder);

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', alMensaje);
        }

        return () => {
            window.removeEventListener('online', alVolver);
            window.removeEventListener('offline', alPerder);

            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.removeEventListener(
                    'message',
                    alMensaje,
                );
            }
        };
    }, [refrescar, sincronizar]);

    return { online, pendientes, sincronizando, sincronizar, refrescar };
}
