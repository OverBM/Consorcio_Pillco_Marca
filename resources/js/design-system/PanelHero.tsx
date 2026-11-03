import { Link } from '@inertiajs/react';
import {
    AnaliticaChart,
    type PuntoSerieAnalitica,
} from './AnaliticaChart';

export interface EventoDia {
    hora: string;
    tipo: 'despacho' | 'eta' | 'otro';
    etiqueta: string;
}

export interface PanelHeroProps {
    obrasActivas: number;
    almacenes: number;
    despachosEnRuta: number;
    requerimientosUrgentes: number;
    eventos?: EventoDia[];
    cargando?: boolean;
    analitica?: {
        serie: PuntoSerieAnalitica[];
        cobertura_dias: number | null;
        mape: number | null;
        quiebres_7d: number;
        alertas: number;
        demanda_media: number;
    };
}

const HORA_INICIO = 7;
const HORA_FIN = 17;

function saludo(hora: number): string {
    if (hora < 12) {
        return 'Buenos días';
    }

    if (hora < 19) {
        return 'Buenas tardes';
    }

    return 'Buenas noches';
}

function posicion(hora: string): number | null {
    const [h, m] = hora.split(':').map(Number);

    if (Number.isNaN(h)) {
        return null;
    }

    const total = h + (Number.isNaN(m) ? 0 : m / 60);

    if (total < HORA_INICIO || total > HORA_FIN) {
        return null;
    }

    return ((total - HORA_INICIO) / (HORA_FIN - HORA_INICIO)) * 100;
}

/**
 * Primera tarjeta del panel: estado del día en una frase, línea de tiempo y
 * dos acciones primarias. Inspirada en el hero del dashboard de referencia.
 */
export function PanelHero({
    obrasActivas,
    almacenes,
    despachosEnRuta,
    requerimientosUrgentes,
    eventos = [],
    cargando = false,
    analitica,
}: PanelHeroProps) {
    const ahora = new Date();
    const hoy = new Intl.DateTimeFormat('es-PE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    }).format(ahora);

    const marcadores = eventos
        .map((evento) => ({ ...evento, left: posicion(evento.hora) }))
        .filter(
            (evento): evento is EventoDia & { left: number } =>
                evento.left !== null,
        );

    const ahoraPct = posicion(
        `${String(ahora.getHours()).padStart(2, '0')}:${String(
            ahora.getMinutes(),
        ).padStart(2, '0')}`,
    );

    return (
        <section className="rounded-card border-line bg-surface shadow-card border p-5 sm:p-6">
            <p className="text-micro text-muted font-mono tracking-wider uppercase">
                {hoy}
            </p>

            <h1 className="text-heading sm:text-display mt-1 font-bold tracking-tight">
                {saludo(ahora.getHours())}.
            </h1>

            <p className="text-body text-muted mt-2 max-w-2xl">
                {cargando ? (
                    <span className="bg-soft text-muted inline-block h-4 w-80 max-w-full animate-pulse rounded" />
                ) : (
                    <>
                        <strong className="text-ink">
                            {obrasActivas}
                        </strong>{' '}
                        {obrasActivas === 1
                            ? 'obra activa'
                            : 'obras activas'}
                        , <strong className="text-ink">{almacenes}</strong>{' '}
                        {almacenes === 1 ? 'almacén' : 'almacenes'} y{' '}
                        <strong className="text-ink">
                            {despachosEnRuta}
                        </strong>{' '}
                        {despachosEnRuta === 1
                            ? 'despacho en ruta'
                            : 'despachos en ruta'}
                        .{' '}
                        {requerimientosUrgentes > 0 ? (
                            <>
                                <strong className="text-critico">
                                    {requerimientosUrgentes}
                                </strong>{' '}
                                {requerimientosUrgentes === 1
                                    ? 'requerimiento urgente'
                                    : 'requerimientos urgentes'}{' '}
                                {requerimientosUrgentes === 1
                                    ? 'requiere'
                                    : 'requieren'}{' '}
                                atención.
                            </>
                        ) : (
                            <>Sin requerimientos urgentes pendientes.</>
                        )}
                    </>
                )}
            </p>

            <div className="mt-5">
                {analitica !== undefined &&
                analitica.serie.some(
                    (punto) =>
                        punto.real !== null || punto.pronostico !== null,
                ) ? (
                    <div>
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="text-micro text-muted font-mono uppercase">
                                Demanda real vs pronóstico · 60 días
                            </p>
                            <Link
                                href="/analitica"
                                className="text-brand-600 text-[11px] font-semibold hover:underline"
                            >
                                Ver analítica →
                            </Link>
                        </div>

                        <AnaliticaChart
                            serie={analitica.serie}
                            alto={120}
                            compacto
                        />

                        <div className="text-micro text-muted mt-2 flex flex-wrap gap-x-4 gap-y-1">
                            <span>
                                Cobertura:{' '}
                                {analitica.cobertura_dias ?? '—'} días
                            </span>
                            <span>
                                MAPE: {analitica.mape ?? '—'}%
                            </span>
                            <span>
                                Quiebres 7d: {analitica.quiebres_7d}
                            </span>
                            <span>Alertas: {analitica.alertas}</span>
                        </div>
                    </div>
                ) : marcadores.length === 0 ? (
                    <p className="rounded-tile bg-soft text-muted px-4 py-6 text-center text-xs">
                        Sin datos de analítica todavía. Ejecuta el motor para
                        ver la demanda y el pronóstico.
                    </p>
                ) : (
                    <>
                        <div className="relative h-10">
                            <div className="bg-brand-500/30 absolute top-4 right-0 left-0 h-0.5 rounded-full">
                                <div
                                    className="bg-brand-500 h-0.5 rounded-full"
                                    style={{
                                        width: `${Math.max(0, Math.min(100, ahoraPct ?? 0))}%`,
                                    }}
                                />
                            </div>

                            {marcadores.map((evento, indice) => (
                                <span
                                    key={`${evento.hora}-${indice}`}
                                    title={`${evento.hora} · ${evento.etiqueta}`}
                                    className={`border-surface absolute top-2.5 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 ${
                                        evento.tipo === 'despacho'
                                            ? 'bg-exito'
                                            : 'bg-atencion'
                                    }`}
                                    style={{ left: `${evento.left}%` }}
                                />
                            ))}

                            {ahoraPct !== null && (
                                <span
                                    className="bg-ink absolute top-0 h-6 w-0.5 -translate-x-1/2"
                                    style={{ left: `${ahoraPct}%` }}
                                    title="Ahora"
                                />
                            )}
                        </div>

                        <div className="text-micro text-muted flex justify-between font-mono">
                            <span>7a</span>
                            <span>9a</span>
                            <span>11a</span>
                            <span>1p</span>
                            <span>3p</span>
                            <span>5p</span>
                        </div>
                    </>
                )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
                <a
                    href="#mapa-red"
                    className="rounded-pill bg-ink px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
                >
                    Abrir mapa
                </a>
                <Link
                    href="/compras/requerimientos"
                    className="rounded-pill border-line text-ink hover:bg-soft border px-4 py-2 text-xs font-semibold"
                >
                    Ver requerimientos
                </Link>
            </div>
        </section>
    );
}
