import { describe, expect, it } from 'vitest';

import {
    ETAPAS_FRENTE,
    FOCUS,
    ZONE_IDS,
    leerZonaHash,
    parseFrente,
    registrarVisita,
    serializeFrente,
    type FrenteEstado,
} from '../features/vitrina/hub-state';

describe('vitrina/hub-state', () => {
    it('resuelve los deep links válidos e ignora el resto', () => {
        expect(leerZonaHash('#geo')).toBe('geo');
        expect(leerZonaHash('#materiales')).toBe('materiales');
        expect(leerZonaHash('#otra')).toBeNull();
        expect(leerZonaHash('')).toBeNull();
    });

    it('define una cámara cercana y finita para las seis zonas', () => {
        expect(Object.keys(FOCUS)).toHaveLength(ZONE_IDS.length);

        for (const zona of ZONE_IDS) {
            const preset = FOCUS[zona];

            expect(Number.isFinite(preset.x)).toBe(true);
            expect(Number.isFinite(preset.y)).toBe(true);
            expect(Number.isFinite(preset.z)).toBe(true);
            expect(preset.dist).toBeGreaterThan(0);
            expect(preset.dist).toBeLessThan(132);
        }
    });

    it('recupera un estado guardado y descarta datos inválidos', () => {
        const guardado: FrenteEstado = {
            etapa: 2,
            visitados: ['pmu', 'pmi'],
        };

        expect(parseFrente(serializeFrente(guardado))).toEqual(guardado);
        expect(parseFrente('{')).toEqual({ etapa: 0, visitados: [] });
        expect(parseFrente(JSON.stringify({ etapa: 9 }))).toEqual({
            etapa: 0,
            visitados: [],
        });
    });

    it('avanza una sola vez por hotspot y se detiene en cuatro etapas', () => {
        let estado = parseFrente(null);

        estado = registrarVisita(estado, 'pmu');
        estado = registrarVisita(estado, 'pmu');
        expect(estado).toEqual({ etapa: 1, visitados: ['pmu'] });

        estado = registrarVisita(estado, 'pmi');
        estado = registrarVisita(estado, 'obra');
        estado = registrarVisita(estado, 'materiales');
        expect(estado.etapa).toBe(4);

        estado = registrarVisita(estado, 'geo');
        expect(estado.etapa).toBe(4);
        expect(estado.visitados).toHaveLength(4);
        expect(ETAPAS_FRENTE).toHaveLength(4);
    });
});
