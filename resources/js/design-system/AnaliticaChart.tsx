// Gráfico SVG de demanda real vs pronóstico con banda de confianza.
// Los puntos principales muestran un tooltip al pasar el cursor o enfocar.

import { useState, type MouseEvent as ReactMouseEvent } from 'react';
import { formatFechaHora } from '../utils/format';

export interface PuntoSerieAnalitica {
    fecha: string;
    real: number | null;
    pronostico: number | null;
    inferior: number | null;
    superior: number | null;
}

interface AnaliticaChartProps {
    serie: PuntoSerieAnalitica[];
    alto?: number;
    compacto?: boolean;
}

interface PuntoGrafico {
    x: number;
    y: number;
    valor: number;
    indice: number;
}

function formatearFecha(fecha: string): string {
    const [, mes, dia] = fecha.split('-');

    return `${dia}/${mes}`;
}

function formatearValor(valor: number): string {
    return valor.toLocaleString('es-PE', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    });
}

function puntos(
    valores: Array<number | null>,
    maximo: number,
): PuntoGrafico[] {
    if (valores.length < 2) {
        return [];
    }

    return valores
        .map((valor, indice) => {
            if (valor === null) {
                return null;
            }

            return {
                x: (indice / (valores.length - 1)) * 100,
                y: 100 - (maximo > 0 ? (valor / maximo) * 92 : 0),
                valor,
                indice,
            };
        })
        .filter((punto): punto is PuntoGrafico => punto !== null);
}

function trazo(puntosSerie: PuntoGrafico[]): string {
    return puntosSerie
        .map((punto) => `${punto.x.toFixed(2)},${punto.y.toFixed(2)}`)
        .join(' ');
}

export function AnaliticaChart({
    serie,
    alto = 240,
    compacto = false,
}: AnaliticaChartProps) {
    const [activo, setActivo] = useState<number | null>(null);

    const conDatos = serie.filter(
        (punto) => punto.real !== null || punto.pronostico !== null,
    );

    if (conDatos.length < 2) {
        return (
            <div
                className="rounded-tile bg-soft text-muted flex items-center justify-center px-4 text-center text-xs"
                style={{ height: alto }}
            >
                Sin datos suficientes. Ejecuta el motor predictivo para ver la
                demanda y el pronóstico.
            </div>
        );
    }

    const maximo = Math.max(
        1,
        ...serie.map((punto) =>
            Math.max(
                punto.real ?? 0,
                punto.pronostico ?? 0,
                punto.superior ?? 0,
            ),
        ),
    );

    const reales = puntos(
        serie.map((punto) => punto.real),
        maximo,
    );
    const pronosticos = puntos(
        serie.map((punto) => punto.pronostico),
        maximo,
    );

    const banda = serie
        .map((punto, indice) => ({ punto, indice }))
        .filter(
            ({ punto }) =>
                punto.inferior !== null && punto.superior !== null,
        );

    const areaBanda =
        banda.length >= 2
            ? [
                  ...banda.map(({ punto, indice }) => ({
                      x: (indice / (serie.length - 1)) * 100,
                      y: 100 - ((punto.superior ?? 0) / maximo) * 92,
                  })),
                  ...[...banda].reverse().map(({ punto, indice }) => ({
                      x: (indice / (serie.length - 1)) * 100,
                      y: 100 - ((punto.inferior ?? 0) / maximo) * 92,
                  })),
              ]
                  .map((punto) => `${punto.x.toFixed(2)},${punto.y.toFixed(2)}`)
                  .join(' ')
            : '';

    const indiceCorte = serie.findIndex((punto) => punto.pronostico !== null);
    const corte =
        indiceCorte >= 0 ? (indiceCorte / (serie.length - 1)) * 100 : null;
    const puntoActivo = activo !== null ? serie[activo] : null;
    const xActivo =
        activo !== null ? (activo / (serie.length - 1)) * 100 : 0;

    const areaReal =
        reales.length > 1
            ? `${reales
                  .map((punto) => `${punto.x.toFixed(2)},${punto.y.toFixed(2)}`)
                  .join(' ')} ${reales[reales.length - 1].x.toFixed(2)},100 ${reales[0].x.toFixed(2)},100`
            : '';

    const alMoverCursor = (
        evento: ReactMouseEvent<SVGSVGElement>,
    ): void => {
        const rect = evento.currentTarget.getBoundingClientRect();
        const relativo = (evento.clientX - rect.left) / rect.width;
        const indice = Math.round(relativo * (serie.length - 1));

        setActivo(Math.max(0, Math.min(serie.length - 1, indice)));
    };

    const dibujarPuntos = (lista: PuntoGrafico[], clase: string) =>
        lista
            .filter(
                (punto) =>
                    activo === punto.indice || punto.indice % 7 === 0,
            )
            .map((punto) => (
                <circle
                    key={`${clase}-${punto.indice}`}
                    cx={punto.x}
                    cy={punto.y}
                    r={activo === punto.indice ? 1.3 : 0.8}
                    className={clase}
                    fill="currentColor"
                >
                    <title>{`${formatFechaHora(serie[punto.indice].fecha)} · ${formatearValor(punto.valor)}`}</title>
                </circle>
            ));

    return (
        <div
            className="relative"
            onMouseLeave={() => setActivo(null)}
        >
            {puntoActivo !== null && (
                <div
                    className="border-line bg-surface text-ink pointer-events-none absolute top-2 z-20 min-w-36 -translate-x-1/2 rounded-xl border px-3 py-2 text-[10px] shadow-lg transition-[left] duration-100 ease-out"
                    style={{
                        left: `${Math.min(88, Math.max(12, xActivo))}%`,
                    }}
                    role="status"
                >
                    <p className="text-muted border-line mb-1 border-b pb-1 font-mono text-[9px] uppercase">
                        {formatFechaHora(puntoActivo.fecha)}
                    </p>
                    {puntoActivo.real !== null && (
                        <p className="mb-0.5 flex items-center justify-between gap-3">
                            <span className="text-muted flex items-center gap-1.5">
                                <span className="bg-brand-500 h-1.5 w-1.5 rounded-full" />
                                Real
                            </span>
                            <strong className="text-brand-600 font-mono">
                                {formatearValor(puntoActivo.real)}
                            </strong>
                        </p>
                    )}
                    {puntoActivo.pronostico !== null && (
                        <p className="mb-0.5 flex items-center justify-between gap-3">
                            <span className="text-muted flex items-center gap-1.5">
                                <span className="bg-sobrante h-1.5 w-1.5 rounded-full" />
                                Pronóstico
                            </span>
                            <strong className="text-sobrante font-mono">
                                {formatearValor(puntoActivo.pronostico)}
                            </strong>
                        </p>
                    )}
                    {puntoActivo.inferior !== null &&
                        puntoActivo.superior !== null && (
                            <p className="text-muted mt-1 flex items-center justify-between gap-3 border-t border-dashed pt-1 text-[9px]">
                                <span>Banda</span>
                                <span className="font-mono">
                                    {formatearValor(puntoActivo.inferior)} –{' '}
                                    {formatearValor(puntoActivo.superior)}
                                </span>
                            </p>
                        )}
                </div>
            )}

            <div style={{ height: alto }}>
                <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    role="img"
                    aria-label="Demanda real y pronóstico con banda de confianza"
                    className="h-full w-full"
                    onMouseMove={alMoverCursor}
                    onMouseLeave={() => setActivo(null)}
                >
                    <defs>
                        <linearGradient
                            id="cpmDemandaFill"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop
                                offset="0%"
                                stopColor="#5468ff"
                                stopOpacity="0.22"
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

                    {corte !== null && (
                        <line
                            x1={corte}
                            x2={corte}
                            y1="0"
                            y2="100"
                            stroke="currentColor"
                            strokeWidth="0.2"
                            strokeDasharray="1 2"
                            className="text-line"
                            vectorEffect="non-scaling-stroke"
                        />
                    )}

                    {activo !== null && (
                        <line
                            x1={xActivo}
                            x2={xActivo}
                            y1="0"
                            y2="100"
                            stroke="currentColor"
                            strokeWidth="0.4"
                            className="text-brand-500/60"
                            vectorEffect="non-scaling-stroke"
                        />
                    )}

                    {areaReal !== '' && (
                        <polygon
                            points={areaReal}
                            fill="url(#cpmDemandaFill)"
                            className="cpm-fade-in"
                        />
                    )}

                    {areaBanda !== '' && (
                        <polygon
                            points={areaBanda}
                            className="cpm-fade-in text-brand-500/10"
                            fill="currentColor"
                        />
                    )}

                    {reales.length > 1 && (
                        <polyline
                            points={trazo(reales)}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            pathLength={1}
                            className="cpm-chart-line text-brand-500"
                            vectorEffect="non-scaling-stroke"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                        />
                    )}

                    {pronosticos.length > 1 && (
                        <polyline
                            points={trazo(pronosticos)}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeDasharray="4 3"
                            className="cpm-fade-in text-sobrante"
                            vectorEffect="non-scaling-stroke"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                        />
                    )}

                    {dibujarPuntos(reales, 'text-brand-500')}
                    {dibujarPuntos(pronosticos, 'text-sobrante')}

                    {[...reales, ...pronosticos].map((punto) => (
                        <circle
                            key={`hit-${punto.indice}`}
                            cx={punto.x}
                            cy={punto.y}
                            r="2.4"
                            fill="transparent"
                            tabIndex={0}
                            role="button"
                            aria-label={`${formatearFecha(serie[punto.indice].fecha)} · ${formatearValor(punto.valor)}`}
                            onMouseEnter={() => setActivo(punto.indice)}
                            onFocus={() => setActivo(punto.indice)}
                            onBlur={() => setActivo(null)}
                            onClick={() => setActivo(punto.indice)}
                            style={{ cursor: 'crosshair' }}
                        />
                    ))}
                </svg>
            </div>

            <div className="text-muted text-micro mt-2 flex items-center justify-between font-mono">
                <span title={formatFechaHora(serie[0].fecha)}>
                    {formatearFecha(serie[0].fecha)}
                </span>
                {!compacto && (
                    <span
                        className="text-muted/70"
                        title={formatFechaHora(new Date().toISOString())}
                    >
                        hoy
                    </span>
                )}
                <span title={formatFechaHora(serie[serie.length - 1].fecha)}>
                    {formatearFecha(serie[serie.length - 1].fecha)}
                </span>
            </div>

            {!compacto && (
                <div className="text-muted text-micro mt-2 flex flex-wrap items-center gap-4">
                    <span className="flex items-center gap-1.5">
                        <span className="bg-brand-500 h-0.5 w-4" />
                        Demanda real
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="border-sobrante h-0 w-4 border-t-2 border-dashed" />
                        Pronóstico
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="bg-brand-500/10 h-2 w-4 rounded-sm" />
                        Banda de confianza
                    </span>
                </div>
            )}

            <p className="text-muted border-line text-micro mt-2 border-t pt-2 font-mono">
                <span className="font-semibold">Periodo:</span>{' '}
                {formatFechaHora(serie[0].fecha)} —{' '}
                {formatFechaHora(serie[serie.length - 1].fecha)}
            </p>
        </div>
    );
}
