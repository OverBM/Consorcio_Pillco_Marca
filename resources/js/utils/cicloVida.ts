// Fuente única del ciclo de vida de obra en el cliente.
// Replica App\Enums\FaseCicloVida y App\Enums\EstadoFase (valores canónicos).

export const FASES_CICLO_VIDA = [
    {
        codigo: 'inicio',
        nombre: 'Inicio',
        responsable: 'Gerente General / PMU',
        orden: 1,
    },
    {
        codigo: 'planificacion',
        nombre: 'Planificación',
        responsable: 'Oficina Técnica / Residente',
        orden: 2,
    },
    {
        codigo: 'ejecucion',
        nombre: 'Ejecución',
        responsable: 'Residente / Maestro de Obra',
        orden: 3,
    },
    {
        codigo: 'monitoreo_control',
        nombre: 'Monitoreo y Control',
        responsable: 'Área Técnica / Supervisión',
        orden: 4,
    },
    {
        codigo: 'cierre',
        nombre: 'Cierre de Obra',
        responsable: 'Consorcio / Entidad Contratante',
        orden: 5,
    },
] as const;

export type FaseCicloVidaCodigo = (typeof FASES_CICLO_VIDA)[number]['codigo'];

export const ESTADOS_FASE = [
    'pendiente',
    'en_proceso',
    'aprobada',
    'rechazada',
] as const;

export type EstadoFaseCodigo = (typeof ESTADOS_FASE)[number];

export function faseAnterior(codigo: string): FaseCicloVidaCodigo | null {
    const indice = FASES_CICLO_VIDA.findIndex((f) => f.codigo === codigo);
    return indice > 0 ? FASES_CICLO_VIDA[indice - 1].codigo : null;
}

export function nombreFase(codigo: string): string {
    return FASES_CICLO_VIDA.find((f) => f.codigo === codigo)?.nombre ?? codigo;
}

export function tonoEstadoFase(
    estado: string,
): 'ok' | 'warn' | 'danger' | 'neutral' {
    if (estado === 'aprobada') return 'ok';
    if (estado === 'en_proceso') return 'warn';
    if (estado === 'rechazada') return 'danger';
    return 'neutral';
}
