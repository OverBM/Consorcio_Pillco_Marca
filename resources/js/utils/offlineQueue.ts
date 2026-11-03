// Cola offline de eventos de campo sobre IndexedDB.
// Los eventos se deduplican por uuid y se sincronizan al recuperar conexión.

export type TipoEventoOffline = 'posicion' | 'marcacion';

export interface EventoOffline {
    uuid: string;
    tipo: TipoEventoOffline;
    url: string;
    payload: Record<string, unknown>;
    created_at: string;
    intentos: number;
}

const NOMBRE_DB = 'obraflow-offline';
const ALMACEN = 'eventos';
const VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function abrirDb(): Promise<IDBDatabase> {
    if (!('indexedDB' in globalThis)) {
        return Promise.reject(new Error('IndexedDB no está disponible.'));
    }

    if (dbPromise) {
        return dbPromise;
    }

    dbPromise = new Promise((resolve, reject) => {
        const solicitud = indexedDB.open(NOMBRE_DB, VERSION);

        solicitud.onupgradeneeded = () => {
            const db = solicitud.result;

            if (!db.objectStoreNames.contains(ALMACEN)) {
                const store = db.createObjectStore(ALMACEN, {
                    keyPath: 'uuid',
                });
                store.createIndex('created_at', 'created_at');
            }
        };

        solicitud.onsuccess = () => resolve(solicitud.result);
        solicitud.onerror = () =>
            reject(solicitud.error ?? new Error('No se pudo abrir IndexedDB.'));
    });

    return dbPromise;
}

export function deduplicarEventos(eventos: EventoOffline[]): EventoOffline[] {
    const porUuid = new Map<string, EventoOffline>();

    for (const evento of eventos) {
        if (!porUuid.has(evento.uuid)) {
            porUuid.set(evento.uuid, evento);
        }
    }

    return [...porUuid.values()];
}

export function construirLote(
    eventos: EventoOffline[],
    maximo = 50,
): EventoOffline[] {
    return deduplicarEventos(eventos)
        .sort(
            (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime(),
        )
        .slice(0, maximo);
}

export async function encolarEvento(
    evento: Pick<EventoOffline, 'tipo' | 'url' | 'payload'>,
): Promise<EventoOffline> {
    const completo: EventoOffline = {
        ...evento,
        uuid: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        intentos: 0,
    };

    const db = await abrirDb();

    await new Promise<void>((resolve, reject) => {
        const transaccion = db.transaction(ALMACEN, 'readwrite');
        transaccion.objectStore(ALMACEN).put(completo);
        transaccion.oncomplete = () => resolve();
        transaccion.onerror = () =>
            reject(transaccion.error ?? new Error('No se pudo encolar.'));
    });

    await registrarBackgroundSync();

    return completo;
}

type RegistroConSync = ServiceWorkerRegistration & {
    sync?: { register: (tag: string) => Promise<void> };
};

async function registrarBackgroundSync(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    try {
        const registro =
            (await navigator.serviceWorker.ready) as RegistroConSync;
        await registro.sync?.register('obraflow-sync');
    } catch {
        // La cola ya quedó guardada; se sincronizará al volver la conexión.
    }
}

export async function listarEventos(): Promise<EventoOffline[]> {
    const db = await abrirDb();

    return new Promise((resolve, reject) => {
        const transaccion = db.transaction(ALMACEN, 'readonly');
        const solicitud = transaccion.objectStore(ALMACEN).getAll();

        solicitud.onsuccess = () => resolve(solicitud.result as EventoOffline[]);
        solicitud.onerror = () =>
            reject(solicitud.error ?? new Error('No se pudo leer la cola.'));
    });
}

export async function contarPendientes(): Promise<number> {
    try {
        return (await listarEventos()).length;
    } catch {
        return 0;
    }
}

export async function eliminarEvento(uuid: string): Promise<void> {
    const db = await abrirDb();

    await new Promise<void>((resolve, reject) => {
        const transaccion = db.transaction(ALMACEN, 'readwrite');
        transaccion.objectStore(ALMACEN).delete(uuid);
        transaccion.oncomplete = () => resolve();
        transaccion.onerror = () =>
            reject(transaccion.error ?? new Error('No se pudo eliminar.'));
    });
}

export function cabecerasJson(): Record<string, string> {
    const csrf =
        document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute('content') ?? '';

    return {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-CSRF-TOKEN': csrf,
    };
}

export async function sincronizarCola(): Promise<{
    enviadas: number;
    fallidas: number;
}> {
    if (!navigator.onLine) {
        return { enviadas: 0, fallidas: 0 };
    }

    const eventos = construirLote(await listarEventos());
    let enviadas = 0;
    let fallidas = 0;

    for (const evento of eventos) {
        try {
            const respuesta = await fetch(evento.url, {
                method: 'POST',
                headers: cabecerasJson(),
                body: JSON.stringify({
                    ...evento.payload,
                    uuid: evento.uuid,
                }),
            });

            if (!respuesta.ok) {
                throw new Error(`Estado ${respuesta.status}`);
            }

            await eliminarEvento(evento.uuid);
            enviadas++;
        } catch {
            fallidas++;
            const db = await abrirDb();
            const transaccion = db.transaction(ALMACEN, 'readwrite');
            transaccion
                .objectStore(ALMACEN)
                .put({ ...evento, intentos: evento.intentos + 1 });
        }
    }

    return { enviadas, fallidas };
}
