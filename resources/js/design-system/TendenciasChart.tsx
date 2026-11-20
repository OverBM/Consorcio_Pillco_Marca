import { useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { formatFecha, formatFechaHora } from '../utils/format';

export interface PuntoSerie {
    fecha: string;
    ingreso: number;
    salida: number;
}

type Modo = 'ambos' | 'ingresos' | 'salidas';

const MODOS: { id: Modo; label: string }[] = [
    { id: 'ambos', label: 'Ingresos y salidas' },
    { id: 'ingresos', label: 'Ingresos' },
    { id: 'salidas', label: 'Salidas' },
];

const ANCHO = 720;
const ALTO = 260;
const MARGEN_SUPERIOR = 12;

/**
 * Coordenadas en un lienzo de 720×260 para que el trazo se dibuje cerca de su
 * tamaño real y no se pixele al estirarse desde un viewBox de 100×100.
 */
function trazo(valores: number[], max: number): string {
    if (valores.length < 2) {
        return '';
    }

    return valores
        .map((valor, indice) => {
            const x = (indice / (valores.length - 1)) * ANCHO;
            const y =
                ALTO -
                MARGEN_SUPERIOR -
                (max > 0 ? (valor / max) * (ALTO - MARGEN_SUPERIOR * 2) : 0);

            return `${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .join(' ');
}

export function TendenciasChart({ serie }: { serie: PuntoSerie[] }) {
    const [modo, setModo] = useState<Modo>('ambos');
    const [activo, setActivo] = useState<number | null>(null);

    const { ingresos, salidas, max } = useMemo(() => {
        const ingresos = serie.map((punto) => punto.ingreso);
        const salidas = serie.map((punto) => punto.salida);

        return {
            ingresos,
            salidas,
            max: Math.max(1, ...ingresos, ...salidas),
        };
    }, [serie]);

    if (serie.length < 2) {
        return (
            <p className="rounded-tile bg-soft text-muted px-4 py-10 text-center text-sm">
                Sin movimientos en los últimos 30 días
            </p>
        );
    }

    const alMoverCursor = (evento: ReactMouseEvent<SVGSVGElement>): void => {
        const rect = evento.currentTarget.getBoundingClientRect();
        const relativo = (evento.clientX - rect.left) / rect.width;
        const indice = Math.round(relativo * (serie.length - 1));

        setActivo(Math.max(0, Math.min(serie.length - 1, indice)));
    };

    const puntoActivo = activo !== null ? serie[activo] : null;
    const xActivo = activo !== null ? (activo / (serie.length - 1)) * ANCHO : 0;
    const xActivoPct = (xActivo / ANCHO) * 100;

    return (
        <div className="relative flex h-full flex-col">
            <div
                role="tablist"
                aria-label="Serie de tendencia"
                className="rounded-pill border-line bg-surface mb-3 inline-flex gap-1 border p-1"
            >
                {MODOS.map((opcion) => (
                    <button
                        key={opcion.id}
                        type="button"
                        role="tab"
                        aria-selected={modo === opcion.id}
                        onClick={() => setModo(opcion.id)}
                        className={`rounded-pill text-label px-3 py-1.5 font-semibold ${
                            modo === opcion.id
                                ? 'bg-soft text-ink'
                                : 'text-muted hover:text-ink'
                        }`}
                    >
                        {opcion.label}
                    </button>
                ))}
            </div>

            {puntoActivo !== null && (
                <div
                    className="border-line bg-surface pointer-events-none absolute top-12 z-10 min-w-32 -translate-x-1/2 rounded-xl border px-3 py-2 text-[10px] shadow-lg"
                    style={{
                        left: `${Math.min(88, Math.max(12, xActivoPct))}%`,
                    }}
                    role="status"
                >
                    <p className="text-muted border-line mb-1 border-b pb-1 font-mono text-[9px]">
                        {formatFechaHora(puntoActivo.fecha)}
                    </p>
                    <p className="text-brand-600 flex items-center justify-between gap-3 font-semibold">
                        <span>Ingresos</span>
                        <span className="font-mono">
                            {puntoActivo.ingreso.toLocaleString('es-PE')}
                        </span>
                    </p>
                    <p className="text-brand-400 flex items-center justify-between gap-3 font-semibold">
                        <span>Salidas</span>
                        <span className="font-mono">
                            {puntoActivo.salida.toLocaleString('es-PE')}
                        </span>
                    </p>
                </div>
            )}

            <svg
                viewBox={`0 0 ${ANCHO} ${ALTO}`}
                preserveAspectRatio="none"
                role="img"
                aria-label="Tendencia de ingresos y salidas de los últimos 30 días"
                className="min-h-40 w-full flex-1"
                shapeRendering="geometricPrecision"
                onMouseMove={alMoverCursor}
                onMouseLeave={() => setActivo(null)}
            >
                <defs>
                    <linearGradient
                        id="cpmTendenciaFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                    >
                        <stop
                            offset="0%"
                            stopColor="#5468ff"
                            stopOpacity="0.2"
                        />
                        <stop
                            offset="100%"
                            stopColor="#5468ff"
                            stopOpacity="0"
                        />
                    </linearGradient>
                </defs>

                {[0, 0.25, 0.5, 0.75, 1].map((factor) => {
                    const y = factor * ALTO;

                    return (
                        <line
                            key={factor}
                            x1="0"
                            x2={ANCHO}
                            y1={y}
                            y2={y}
                            stroke="currentColor"
                            strokeWidth="1"
                            className="text-line"
                            vectorEffect="non-scaling-stroke"
                        />
                    );
                })}

                {(modo === 'ambos' || modo === 'ingresos') && (
                    <>
                        <polygon
                            points={`${trazo(ingresos, max)} ${ANCHO},${ALTO} 0,${ALTO}`}
                            fill="url(#cpmTendenciaFill)"
                            className="cpm-fade-in"
                        />
                        <polyline
                            points={trazo(ingresos, max)}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            pathLength={1}
                            className="cpm-chart-line text-brand-500"
                            vectorEffect="non-scaling-stroke"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                        />
                    </>
                )}

                {(modo === 'ambos' || modo === 'salidas') && (
                    <polyline
                        points={trazo(salidas, max)}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeDasharray="7 5"
                        className="cpm-fade-in text-brand-300"
                        vectorEffect="non-scaling-stroke"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                    />
                )}

                {activo !== null && (
                    <>
                        <line
                            x1={xActivo}
                            x2={xActivo}
                            y1="0"
                            y2={ALTO}
                            stroke="currentColor"
                            strokeWidth="1"
                            className="text-brand-300"
                            vectorEffect="non-scaling-stroke"
                        />
                        <circle
                            cx={xActivo}
                            cy={
                                ALTO -
                                MARGEN_SUPERIOR -
                                ((modo === 'salidas'
                                    ? salidas[activo]
                                    : ingresos[activo]) /
                                    max) *
                                    (ALTO - MARGEN_SUPERIOR * 2)
                            }
                            r="4"
                            fill="currentColor"
                            className="text-brand-500"
                        />
                    </>
                )}
            </svg>

            <div className="text-muted text-micro mt-3 flex items-center justify-between">
                <span title={formatFechaHora(serie[0]?.fecha ?? '')}>
                    {formatFecha(serie[0]?.fecha ?? '')}
                </span>
                <div className="flex items-center gap-3">
                    {modo !== 'salidas' && (
                        <span className="flex items-center gap-1">
                            <span className="bg-brand-500 h-0.5 w-4" /> Ingresos
                        </span>
                    )}
                    {modo !== 'ingresos' && (
                        <span className="flex items-center gap-1">
                            <span className="bg-brand-300 h-0.5 w-4" /> Salidas
                        </span>
                    )}
                </div>
                <span
                    title={formatFechaHora(
                        serie[serie.length - 1]?.fecha ?? '',
                    )}
                >
                    {formatFecha(serie[serie.length - 1]?.fecha ?? '')}
                </span>
            </div>

            <p className="text-muted border-line text-micro mt-2 border-t pt-2 font-mono">
                <span className="font-semibold">Periodo:</span>{' '}
                {formatFechaHora(serie[0]?.fecha ?? '')} —{' '}
                {formatFechaHora(serie[serie.length - 1]?.fecha ?? '')}
            </p>
        </div>
    );
}
