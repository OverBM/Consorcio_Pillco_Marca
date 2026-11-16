import { Link } from '@inertiajs/react';

import { KpiTile } from './KpiTile';
import { IconArrowUpRight } from '../components/icons';

export interface AccesoRapido {
    href: string;
    label: string;
}

/**
 * Indicadores de la capa cognitiva (EOQ, forecasting, alertas). Se reservan
 * desde ahora para no rediseñar el panel cuando exista el motor.
 */
export function TilesCognitivos() {
    const indicadores = [
        {
            label: 'Cobertura de stock',
            detalle: 'Días de inventario disponible',
        },
        {
            label: 'Quiebres proyectados',
            detalle: 'Próximos 7 días',
        },
        {
            label: 'SKUs bajo ROP',
            detalle: 'Requieren reposición',
        },
        { label: 'EOQ sugerido', detalle: 'Cantidad óptima de pedido' },
    ];

    return (
        <section aria-label="Indicadores predictivos">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {indicadores.map((indicador) => (
                    <KpiTile
                        key={indicador.label}
                        label={indicador.label}
                        value={null}
                        detalle={indicador.detalle}
                    />
                ))}
            </div>
        </section>
    );
}

/** Accesos rápidos en una sola fila de chips. */
export function AccesosRapidos({ accesos }: { accesos: AccesoRapido[] }) {
    if (accesos.length === 0) {
        return null;
    }

    return (
        <nav
            aria-label="Accesos rápidos"
            className="grid h-full flex-1 auto-rows-fr grid-cols-1 gap-2 sm:grid-cols-2"
        >
            {accesos.map((acceso, indice) => (
                <Link
                    key={acceso.href}
                    href={acceso.href}
                    className="border-line bg-surface text-ink hover:border-brand-300 hover:bg-brand-50 group flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-xs font-semibold transition-colors"
                >
                    <span className="flex min-w-0 items-center gap-2.5">
                        <span className="bg-brand-100 text-brand-700 grid h-6 w-6 shrink-0 place-items-center rounded-md font-mono text-[10px] font-bold">
                            {String(indice + 1).padStart(2, '0')}
                        </span>
                        <span className="truncate">{acceso.label}</span>
                    </span>
                    <IconArrowUpRight
                        size={14}
                        className="text-muted group-hover:text-brand-600 shrink-0 transition-colors"
                    />
                </Link>
            ))}
        </nav>
    );
}
