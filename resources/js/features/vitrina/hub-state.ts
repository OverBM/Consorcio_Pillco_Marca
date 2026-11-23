export type ZoneId = 'pmu' | 'pmi' | 'obra' | 'materiales' | 'geo' | 'cierre';

export const ZONE_IDS: ZoneId[] = [
    'pmu',
    'pmi',
    'obra',
    'materiales',
    'geo',
    'cierre',
];

export const FOCUS: Record<
    ZoneId,
    { x: number; y: number; z: number; dist: number }
> = {
    pmu: { x: -26, y: 1.5, z: 22, dist: 40 },
    pmi: { x: -19, y: 1.5, z: -23, dist: 34 },
    obra: { x: -0.6, y: 6, z: 23.5, dist: 60 },
    materiales: { x: -10, y: 2, z: -3, dist: 40 },
    geo: { x: 37, y: 1.5, z: 8, dist: 30 },
    cierre: { x: 24, y: 1.5, z: -14, dist: 38 },
};

export const ETAPAS_FRENTE = ['Zanja', 'Fierro', 'Encofrado', 'Losa'] as const;

export interface FrenteEstado {
    etapa: number;
    visitados: ZoneId[];
}

export const FRENTE_STORAGE_KEY = 'hub-frente-v1';

const FRENTE_INICIAL: FrenteEstado = { etapa: 0, visitados: [] };

function esZona(value: unknown): value is ZoneId {
    return typeof value === 'string' && (ZONE_IDS as string[]).includes(value);
}

export function leerZonaHash(hash: string): ZoneId | null {
    const id = hash.replace('#', '');

    return esZona(id) ? id : null;
}

export function parseFrente(raw: string | null): FrenteEstado {
    if (!raw) {
        return { ...FRENTE_INICIAL };
    }

    try {
        const parsed = JSON.parse(raw) as Partial<FrenteEstado>;
        const visitados = Array.isArray(parsed.visitados)
            ? parsed.visitados.filter(esZona)
            : [];
        const etapa =
            typeof parsed.etapa === 'number' && Number.isFinite(parsed.etapa)
                ? Math.min(4, Math.max(0, Math.round(parsed.etapa)))
                : 0;

        return {
            etapa: Math.min(etapa, visitados.length),
            visitados: [...new Set(visitados)],
        };
    } catch {
        return { ...FRENTE_INICIAL };
    }
}

export function serializeFrente(estado: FrenteEstado): string {
    return JSON.stringify(estado);
}

export function registrarVisita(
    estado: FrenteEstado,
    id: ZoneId,
): FrenteEstado {
    if (estado.etapa >= 4 || estado.visitados.includes(id)) {
        return estado;
    }

    return {
        etapa: Math.min(4, estado.etapa + 1),
        visitados: [...estado.visitados, id],
    };
}
