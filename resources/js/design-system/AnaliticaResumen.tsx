// Resumen estadístico del módulo de Analítica: distribución de alertas,
// demanda por almacén, clasificación ABC y ejecuciones del motor.

import { KpiTile } from './KpiTile';
import { AnaliticaChart, type PuntoSerieAnalitica } from './AnaliticaChart';
import { formatFechaHora } from '../utils/format';

interface ParametroResumen {
    almacen_id: number;
    clase_abc: string;
    demanda_media_diaria: number | string;
    eoq: number | string | null;
    almacen?: { nombre: string };
}

interface AlertaResumen {
    severidad: string;
    tipo: string;
}

interface EjecucionResumen {
    id: number;
    estado: string;
    inicio: string;
    duracion_ms: number | null;
}

interface AnaliticaResumenProps {
    serieAnalitica: {
        serie: PuntoSerieAnalitica[];
        cobertura_dias: number | null;
        mape: number | null;
        quiebres_7d: number;
        alertas: number;
        demanda_media: number;
    };
    parametrosDb: ParametroResumen[];
    alertasDb: AlertaResumen[];
    ejecucionesDb: EjecucionResumen[];
    resumen: {
        parametros_vigentes: number;
        alertas_vigentes: number;
        alertas_criticas: number;
        quiebres_7d: number;
        eoq_promedio_a: number | string | null;
        demanda_media_total: number;
    };
}

const numero = (valor: number | string | null | undefined): string =>
    valor === null || valor === undefined
        ? '—'
        : new Intl.NumberFormat('es-PE', {
              maximumFractionDigits: 1,
          }).format(Number(valor));

function Donut({
    segmentos,
    total,
}: {
    segmentos: Array<{ label: string; valor: number; clase: string }>;
    total: number;
}) {
    const suma =
        total > 0 ? total : segmentos.reduce((acc, s) => acc + s.valor, 0);
    let desplazamiento = 0;

    return (
        <div className="relative grid place-items-center">
            <svg
                viewBox="0 0 42 42"
                className="cpm-donut h-36 w-36 -rotate-90"
            >
                <circle
                    cx="21"
                    cy="21"
                    r="15.9155"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="5"
                    className="text-line"
                />
                {segmentos.map((segmento) => {
                    const porcentaje =
                        suma > 0 ? (segmento.valor / suma) * 100 : 0;
                    const elemento = (
                        <circle
                            key={segmento.label}
                            cx="21"
                            cy="21"
                            r="15.9155"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="5"
                            strokeDasharray={`${porcentaje} ${100 - porcentaje}`}
                            strokeDashoffset={-desplazamiento}
                            className={segmento.clase}
                        />
                    );
                    desplazamiento += porcentaje;

                    return elemento;
                })}
            </svg>
            <div className="pointer-events-none absolute text-center">
                <p className="text-ink font-display text-2xl font-bold">
                    {numero(suma)}
                </p>
                <p className="text-muted text-[10px] uppercase">total</p>
            </div>
        </div>
    );
}

function Leyenda({
    items,
}: {
    items: Array<{ label: string; valor: number; clase: string }>;
}) {
    return (
        <ul className="space-y-1.5 text-xs">
            {items.map((item) => (
                <li
                    key={item.label}
                    className="flex items-center justify-between gap-3"
                >
                    <span className="text-muted flex items-center gap-1.5">
                        <span
                            className={`h-2 w-2 rounded-full ${item.clase}`}
                        />
                        {item.label}
                    </span>
                    <strong className="text-ink font-mono">
                        {numero(item.valor)}
                    </strong>
                </li>
            ))}
        </ul>
    );
}

function Barras({
    items,
}: {
    items: Array<{ label: string; valor: number; detalle?: string }>;
}) {
    const maximo = Math.max(...items.map((item) => item.valor), 1);

    return (
        <ul className="space-y-3">
            {items.map((item) => (
                <li key={item.label}>
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                        <span className="text-ink truncate font-medium">
                            {item.label}
                        </span>
                        <span className="text-muted font-mono">
                            {numero(item.valor)}
                        </span>
                    </div>
                    <div className="bg-soft mt-1 h-2 overflow-hidden rounded-full">
                        <div
                            className="cpm-bar-grow bg-brand-500 h-full rounded-full"
                            style={{
                                width: `${Math.min(100, (item.valor / maximo) * 100)}%`,
                            }}
                        />
                    </div>
                    {item.detalle && (
                        <p className="text-muted mt-0.5 text-[10px]">
                            {item.detalle}
                        </p>
                    )}
                </li>
            ))}
        </ul>
    );
}

export function AnaliticaResumen({
    serieAnalitica,
    parametrosDb,
    alertasDb,
    ejecucionesDb,
    resumen,
}: AnaliticaResumenProps) {
    const severidades = ['critica', 'alta', 'media', 'baja'].map(
        (severidad) => ({
            label:
                severidad === 'critica'
                    ? 'Críticas'
                    : severidad === 'alta'
                      ? 'Altas'
                      : severidad === 'media'
                        ? 'Medias'
                        : 'Bajas',
            valor: alertasDb.filter(
                (alerta) => alerta.severidad === severidad,
            ).length,
            clase:
                severidad === 'critica'
                    ? 'text-critico'
                    : severidad === 'alta'
                      ? 'text-atencion'
                      : severidad === 'media'
                        ? 'text-brand-500'
                        : 'text-muted',
            punto:
                severidad === 'critica'
                    ? 'bg-critico'
                    : severidad === 'alta'
                      ? 'bg-atencion'
                      : severidad === 'media'
                        ? 'bg-brand-500'
                        : 'bg-line',
        }),
    );

    const porAlmacen = Object.values(
        parametrosDb.reduce<
            Record<
                number,
                { label: string; valor: number; detalle: number }
            >
        >((acumulado, parametro) => {
            const clave = parametro.almacen_id;
            const actual = acumulado[clave] ?? {
                label: parametro.almacen?.nombre ?? `Almacén ${clave}`,
                valor: 0,
                detalle: 0,
            };

            actual.valor += Number(parametro.demanda_media_diaria);
            actual.detalle += 1;
            acumulado[clave] = actual;

            return acumulado;
        }, {}),
    )
        .sort((a, b) => b.valor - a.valor)
        .map((item) => ({
            label: item.label,
            valor: Math.round(item.valor * 10) / 10,
            detalle: `${item.detalle} materiales`,
        }));

    const clases = ['A', 'B', 'C'].map((clase) => ({
        label: `Clase ${clase}`,
        valor: parametrosDb.filter(
            (parametro) => parametro.clase_abc === clase,
        ).length,
        clase:
            clase === 'A'
                ? 'bg-exito'
                : clase === 'B'
                  ? 'bg-atencion'
                  : 'bg-line',
    }));

    const ejecuciones = [...ejecucionesDb].slice(0, 8).reverse();
    const maxDuracion = Math.max(
        ...ejecuciones.map((ejecucion) => ejecucion.duracion_ms ?? 0),
        1,
    );

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <KpiTile
                    label="Demanda media diaria"
                    value={resumen.demanda_media_total}
                    detalle={`${resumen.parametros_vigentes} pares calculados`}
                />
                <KpiTile
                    label="MAPE del modelo"
                    value={serieAnalitica.mape}
                    formato="porcentaje"
                    variante="brand"
                    detalle="Error medio del pronóstico"
                />
                <KpiTile
                    label="Alertas vigentes"
                    value={resumen.alertas_vigentes}
                    variante="dark"
                    detalle={`${resumen.alertas_criticas} críticas`}
                />
                <KpiTile
                    label="Cobertura de stock"
                    value={serieAnalitica.cobertura_dias}
                    detalle="Días de demanda cubiertos"
                />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <section className="border-line bg-surface rounded-xl border p-4">
                    <h3 className="text-ink text-sm font-bold">
                        Alertas por severidad
                    </h3>
                    <p className="text-muted text-xs">
                        Distribución de las alertas vigentes
                    </p>
                    <div className="mt-3 flex items-center gap-4">
                        <Donut
                            segmentos={severidades.map((s) => ({
                                label: s.label,
                                valor: s.valor,
                                clase: s.clase,
                            }))}
                            total={resumen.alertas_vigentes}
                        />
                        <div className="flex-1">
                            <Leyenda
                                items={severidades.map((s) => ({
                                    label: s.label,
                                    valor: s.valor,
                                    clase: s.punto,
                                }))}
                            />
                        </div>
                    </div>
                </section>

                <section className="border-line bg-surface rounded-xl border p-4">
                    <h3 className="text-ink text-sm font-bold">
                        Demanda por almacén
                    </h3>
                    <p className="text-muted text-xs">
                        Demanda media diaria calculada por el motor
                    </p>
                    <div className="mt-3">
                        {porAlmacen.length > 0 ? (
                            <Barras items={porAlmacen} />
                        ) : (
                            <p className="text-muted text-xs">
                                Sin parámetros calculados.
                            </p>
                        )}
                    </div>
                </section>

                <section className="border-line bg-surface rounded-xl border p-4">
                    <h3 className="text-ink text-sm font-bold">
                        Clasificación ABC
                    </h3>
                    <p className="text-muted text-xs">
                        Materiales por valor de consumo
                    </p>
                    <div className="mt-3 flex items-center gap-4">
                        <Donut
                            segmentos={clases.map((clase) => ({
                                label: clase.label,
                                valor: clase.valor,
                                clase: clase.clase.replace(
                                    'bg-',
                                    'text-',
                                ),
                            }))}
                            total={resumen.parametros_vigentes}
                        />
                        <div className="flex-1">
                            <Leyenda items={clases} />
                        </div>
                    </div>
                </section>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <section className="border-line bg-surface rounded-xl border p-4 xl:col-span-2">
                    <div className="mb-2 flex items-center justify-between">
                        <div>
                            <h3 className="text-ink text-sm font-bold">
                                Demanda y pronóstico
                            </h3>
                            <p className="text-muted text-xs">
                                30 días reales + 30 proyectados
                            </p>
                        </div>
                        <span className="text-muted font-mono text-[11px]">
                            MAPE {numero(serieAnalitica.mape)}%
                        </span>
                    </div>
                    <AnaliticaChart serie={serieAnalitica.serie} alto={200} />
                </section>

                <section className="border-line bg-surface rounded-xl border p-4">
                    <h3 className="text-ink text-sm font-bold">
                        Ejecuciones del motor
                    </h3>
                    <p className="text-muted text-xs">
                        Duración de las últimas corridas
                    </p>
                    {ejecuciones.length === 0 ? (
                        <p className="text-muted mt-3 text-xs">
                            Sin ejecuciones registradas.
                        </p>
                    ) : (
                        <>
                            <div className="mt-3 flex h-36 items-end gap-2">
                            {ejecuciones.map((ejecucion) => (
                                <div
                                    key={ejecucion.id}
                                    className="flex h-full flex-1 flex-col justify-end"
                                    title={`${formatFechaHora(ejecucion.inicio)} · ${((ejecucion.duracion_ms ?? 0) / 1000).toFixed(1)} s`}
                                >
                                    <div
                                        className={`cpm-fade-in w-full rounded-t ${
                                            ejecucion.estado === 'completada'
                                                ? 'bg-brand-500'
                                                : 'bg-critico'
                                        }`}
                                        style={{
                                            height: `${Math.max(
                                                4,
                                                ((ejecucion.duracion_ms ?? 0) /
                                                    maxDuracion) *
                                                    100,
                                            )}%`,
                                        }}
                                    />
                                    <span className="text-muted mt-1 text-center text-[9px]">
                                        {new Date(
                                            ejecucion.inicio,
                                        ).toLocaleDateString('es-PE', {
                                            day: '2-digit',
                                        })}
                                    </span>
                                </div>
                            ))}
                            </div>
                            <p className="text-muted border-line text-micro mt-2 border-t pt-2 font-mono">
                                <span className="font-semibold">
                                    Periodo:
                                </span>{' '}
                                {formatFechaHora(
                                    ejecuciones[0]?.inicio ?? '',
                                )}{' '}
                                —{' '}
                                {formatFechaHora(
                                    ejecuciones[ejecuciones.length - 1]
                                        ?.inicio ?? '',
                                )}
                            </p>
                        </>
                    )}
                </section>
            </div>
        </div>
    );
}
