import {
    useMemo,
    useState,
    type MouseEvent as ReactMouseEvent,
} from 'react';
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

function trazo(valores: number[], max: number): string {
    if (valores.length < 2) {
        return '';
    }

    return valores
        .map((valor, indice) => {
            const x = (indice / (valores.length - 1)) * 100;
            const y = 100 - (max > 0 ? (valor / max) * 96 : 0);

            return `${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .join(' ');
}

/**
 * Tendencia de 30 días con selector de serie. El trazo se calcula en SVG para
 * evitar una librería de gráficos y mantener el control del estilo.
 */
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

    const alMoverCursor = (
        evento: ReactMouseEvent<SVGSVGElement>,
    ): void => {
        const rect = evento.currentTarget.getBoundingClientRect();
        const relativo = (evento.clientX - rect.left) / rect.width;
        const indice = Math.round(relativo * (serie.length - 1));

        setActivo(Math.max(0, Math.min(serie.length - 1, indice)));
    };

    const puntoActivo = activo !== null ? serie[activo] : null;
    const xActivo =
        activo !== null ? (activo / (serie.length - 1)) * 100 : 0;

    return (
        <div className="relative">
            <div
                role="tablist"
                aria-label="Serie de tendencia"
                className="rounded-pill border-line bg-surface mb-4 inline-flex gap-1 border p-1"
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
                    className="border-line bg-surface pointer-events-none absolute top-2 z-10 min-w-32 -translate-x-1/2 rounded-xl border px-3 py-2 text-[10px] shadow-lg"
                    style={{ left: `${Math.min(88, Math.max(12, xActivo))}%` }}
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
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                role="img"
                aria-label="Tendencia de ingresos y salidas de los últimos 30 días"
                className="h-56 w-full"
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

                {[0, 25, 50, 75, 100].map((y) => (
                    <line
                        key={y}
                        x1="0"
                        x2="100"
                        y1={y}
                        y2={y}
                        stroke="currentColor"
                        strokeWidth="0.2"
                        className="text-line"
                        vectorEffect="non-scaling-stroke"
                    />
                ))}

                {(modo === 'ambos' || modo === 'ingresos') && (
                    <>
                        <polygon
                            points={`${trazo(ingresos, max)} 100,100 0,100`}
                            fill="url(#cpmTendenciaFill)"
                            className="cpm-fade-in"
                        />
                        <polyline
                            points={trazo(ingresos, max)}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
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
                        strokeWidth="2"
                        strokeDasharray="4 3"
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
                            y2="100"
                            stroke="currentColor"
                            strokeWidth="0.4"
                            className="text-brand-300"
                            vectorEffect="non-scaling-stroke"
                        />
                        <circle
                            cx={xActivo}
                            cy={
                                100 -
                                ((modo === 'salidas'
                                    ? salidas[activo]
                                    : ingresos[activo]) /
                                    max) *
                                    96
                            }
                            r="1.2"
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
