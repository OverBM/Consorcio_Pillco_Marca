import { describe, expect, it } from 'vitest';
import {
    construirLote,
    deduplicarEventos,
    type EventoOffline,
} from '../../utils/offlineQueue';

function evento(
    uuid: string,
    created_at: string,
    intentos = 0,
): EventoOffline {
    return {
        uuid,
        tipo: 'posicion',
        url: '/api/v1/despachos/1/posiciones',
        payload: { lat: -12.06, lng: -75.21 },
        created_at,
        intentos,
    };
}

describe('offlineQueue', () => {
    it('deduplica eventos por uuid conservando el primero', () => {
        const original = evento('a', '2026-11-02T10:00:00Z');
        const duplicado = evento('a', '2026-11-02T10:05:00Z', 3);

        expect(deduplicarEventos([original, duplicado])).toEqual([original]);
    });

    it('ordena por fecha ascendente y respeta el máximo del lote', () => {
        const lote = construirLote(
            [
                evento('b', '2026-11-02T10:02:00Z'),
                evento('a', '2026-11-02T10:01:00Z'),
                evento('c', '2026-11-02T10:03:00Z'),
            ],
            2,
        );

        expect(lote.map((item) => item.uuid)).toEqual(['a', 'b']);
    });

    it('limita el lote a 50 elementos por defecto', () => {
        const eventos = Array.from({ length: 60 }, (_, indice) =>
            evento(
                `uuid-${indice}`,
                `2026-11-02T10:${String(indice).padStart(2, '0')}:00Z`,
            ),
        );

        expect(construirLote(eventos)).toHaveLength(50);
    });
});
