// Service worker mínimo de ObraFlow.
// No cachea assets (Vite ya los versiona); su función es habilitar
// Background Sync y avisar a las pestañas abiertas para vaciar la cola.

const ETIQUETA_SYNC = 'obraflow-sync';

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
    evento.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
    // Sin intercepción: la red y el manifiesto de Vite mandan.
});

self.addEventListener('sync', (evento) => {
    if (evento.tag !== ETIQUETA_SYNC) {
        return;
    }

    evento.waitUntil(
        self.clients
            .matchAll({ includeUncontrolled: true, type: 'window' })
            .then((clientes) => {
                clientes.forEach((cliente) => {
                    cliente.postMessage({ type: 'obraflow:sincronizar' });
                });
            }),
    );
});

self.addEventListener('message', (evento) => {
    if (evento.data?.type === 'obraflow:saltar-espera') {
        self.skipWaiting();
    }
});
