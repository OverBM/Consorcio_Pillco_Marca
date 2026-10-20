import { describe, expect, it } from 'vitest';

import {
    ESTADOS_FASE,
    FASES_CICLO_VIDA,
    faseAnterior,
    nombreFase,
    tonoEstadoFase,
} from '../../utils/cicloVida';

describe('utils/cicloVida', () => {
    it('expone las cinco fases canónicas ordenadas', () => {
        expect(FASES_CICLO_VIDA.map((fase) => fase.codigo)).toEqual([
            'inicio',
            'planificacion',
            'ejecucion',
            'monitoreo_control',
            'cierre',
        ]);
        expect(ESTADOS_FASE).toHaveLength(4);
    });

    it('devuelve la fase anterior y null en la primera', () => {
        expect(faseAnterior('cierre')).toBe('monitoreo_control');
        expect(faseAnterior('inicio')).toBeNull();
        expect(faseAnterior('desconocida')).toBeNull();
    });

    it('resuelve el nombre de la fase con respaldo al código', () => {
        expect(nombreFase('ejecucion')).toBe('Ejecución');
        expect(nombreFase('otra')).toBe('otra');
    });

    it('traduce el estado de fase a tono visual', () => {
        expect(tonoEstadoFase('aprobada')).toBe('ok');
        expect(tonoEstadoFase('en_proceso')).toBe('warn');
        expect(tonoEstadoFase('rechazada')).toBe('danger');
        expect(tonoEstadoFase('pendiente')).toBe('neutral');
    });
});
