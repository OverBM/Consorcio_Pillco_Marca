import type { ReactNode } from 'react';
import { useAnimatedNumber } from './useAnimatedNumber';

export type FormatoKpi = 'moneda' | 'numero' | 'porcentaje';

export interface KpiTileProps {
    label: string;
    value: number | null;
    formato?: FormatoKpi;
    delta?: number | null;
    periodo?: string;
    serie?: number[];
    variante?: 'dark' | 'light' | 'brand';
    detalle?: string;
    icon?: ReactNode;
    progreso?: number | null;
    progresoTono?: 'ok' | 'warn' | 'danger';
}

const formateadores: Record<FormatoKpi, (valor: number) => string> = {
    moneda: (valor) =>
        new Intl.NumberFormat('es-PE', {
            style: 'currency',
            currency: 'PEN',
            maximumFractionDigits: 0,
        }).format(valor),
    numero: (valor) =>
        new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 }).format(
            valor,
        ),
    porcentaje: (valor) => `${valor.toFixed(1)}%`,
};

function Sparkline({ serie }: { serie: number[] }) {
    if (serie.length < 2) {
        return null;
    }

    const max = Math.max(...serie);
    const min = Math.min(...serie);
    const rango = max - min || 1;
    const puntos = serie
        .map((valor, indice) => {
            const x = (indice / (serie.length - 1)) * 100;
            const y = 28 - ((valor - min) / rango) * 24;

            return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');

    return (
        <svg
            viewBox="0 0 100 32"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="h-10 w-full"
        >
            <polyline
                points={puntos}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    );
}

/**
 * Tile de indicador con count-up, delta y micrográfico.
 * Si no hay valor, muestra "sin datos" sin romper la grilla.
 */
export function KpiTile({
    label,
    value,
    formato = 'numero',
    delta = null,
    periodo = 'vs. mes anterior',
    serie = [],
    variante = 'light',
    detalle,
    icon,
    progreso = null,
    progresoTono = 'ok',
}: KpiTileProps) {
    const animado = useAnimatedNumber(value ?? 0);
    const oscuro = variante === 'dark';
    const marca = variante === 'brand';

    return (
        <article
            className={`cpm-kpi rounded-tile relative flex min-h-[132px] flex-col overflow-hidden border p-4 ${
                oscuro
                    ? 'border-ink bg-ink text-white'
                    : marca
                      ? 'border-brand-200 bg-brand-100 text-brand-900'
                      : 'border-line bg-surface text-ink shadow-card'
            }`}
            title={detalle}
        >
            <div className="flex items-start justify-between gap-2">
                <span
                    className={`text-micro font-mono tracking-wider uppercase ${
                        oscuro
                            ? 'text-white/70'
                            : marca
                              ? 'text-brand-800/80'
                              : 'text-muted'
                    }`}
                >
                    {label}
                </span>
                {icon && (
                    <span
                        className={
                            oscuro
                                ? 'text-white/70'
                                : marca
                                  ? 'text-brand-700'
                                  : 'text-muted'
                        }
                    >
                        {icon}
                    </span>
                )}
            </div>

            <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-figure font-bold tabular-nums">
                    {value === null ? '—' : formateadores[formato](animado)}
                </span>
            </div>

            {detalle && (
                <p
                    className={`mt-1 text-[10px] leading-tight ${
                        oscuro
                            ? 'text-white/60'
                            : marca
                              ? 'text-brand-800/70'
                              : 'text-muted'
                    }`}
                >
                    {detalle}
                </p>
            )}

            {progreso !== null && (
                <div
                    className={`mt-2 h-1.5 w-full overflow-hidden rounded-full ${
                        oscuro ? 'bg-white/15' : 'bg-soft'
                    }`}
                >
                    <div
                        className={`h-full rounded-full ${
                            progresoTono === 'danger'
                                ? 'bg-critico'
                                : progresoTono === 'warn'
                                  ? 'bg-atencion'
                                  : 'bg-exito'
                        }`}
                        style={{
                            width: `${Math.min(100, Math.max(0, progreso))}%`,
                        }}
                    />
                </div>
            )}

            <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                <div className="text-label">
                    {value === null ? (
                        <span
                            className={oscuro ? 'text-white/60' : 'text-muted'}
                        >
                            sin datos
                        </span>
                    ) : delta === null ? null : (
                        <span
                            className={`font-semibold ${
                                delta >= 0
                                    ? oscuro
                                        ? 'text-exito-soft'
                                        : 'text-exito'
                                    : oscuro
                                      ? 'text-critico-soft'
                                      : 'text-critico'
                            }`}
                        >
                            {delta > 0 ? '+' : ''}
                            {delta.toFixed(1)}%{' '}
                            <span className="font-normal opacity-70">
                                {periodo}
                            </span>
                        </span>
                    )}
                </div>
                {serie.length > 1 && (
                    <span
                        className={`w-20 ${oscuro ? 'text-brand-300' : marca ? 'text-brand-700' : 'text-brand-500'}`}
                    >
                        <Sparkline serie={serie} />
                    </span>
                )}
            </div>
        </article>
    );
}
