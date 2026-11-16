import { describe, expect, it, vi } from 'vitest';

import {
    cabecerasJson,
    construirLote,
    contarPendientes,
    deduplicarEventos,
    sincronizarCola,
    type EventoOffline,
} from '../../utils/offlineQueue';

function evento(
    uuid: string,
    created_at: string,
    tipo: EventoOffline['tipo'] = 'posicion',
): EventoOffline {
    return {
        uuid,
        tipo,
        url: '/api/v1/geo/posiciones',
        payload: { lat: -12.06, lng: -75.2 },
        created_at,
        intentos: 0,
    };
}

describe('utils/offlineQueue', () => {
    it('deduplica eventos conservando el primero de cada uuid', () => {
        const resultado = deduplicarEventos([
            evento('a', '2026-11-10T10:00:00Z'),
            evento('a', '2026-11-10T11:00:00Z'),
            evento('b', '2026-11-10T09:00:00Z'),
        ]);

        expect(resultado).toHaveLength(2);
        expect(resultado[0].created_at).toBe('2026-11-10T10:00:00Z');
    });

    it('ordena por fecha y respeta el máximo del lote', () => {
        const lote = construirLote(
            [
                evento('c', '2026-11-10T12:00:00Z'),
                evento('a', '2026-11-10T08:00:00Z'),
                evento('b', '2026-11-10T10:00:00Z'),
            ],
            2,
        );

        expect(lote.map((item) => item.uuid)).toEqual(['a', 'b']);
    });

    it('construye las cabeceras JSON con el token CSRF del documento', () => {
        document.head.innerHTML =
            '<meta name="csrf-token" content="token-prueba">';

        expect(cabecerasJson()).toEqual({
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-CSRF-TOKEN': 'token-prueba',
        });

        document.head.innerHTML = '';
    });

    it('cuenta cero pendientes cuando IndexedDB no está disponible', async () => {
        expect(await contarPendientes()).toBe(0);
    });

    it('no sincroniza nada cuando el navegador está sin conexión', async () => {
        vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

        await expect(sincronizarCola()).resolves.toEqual({
            enviadas: 0,
            fallidas: 0,
        });

        vi.restoreAllMocks();
    });
});
