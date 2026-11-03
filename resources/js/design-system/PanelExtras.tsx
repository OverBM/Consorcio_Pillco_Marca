import { Link } from '@inertiajs/react';

import { KpiTile } from './KpiTile';

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
            className="flex gap-2 overflow-x-auto pb-1"
        >
            {accesos.map((acceso) => (
                <Link
                    key={acceso.href}
                    href={acceso.href}
                    className="rounded-pill border-line bg-surface text-ink shadow-card hover:bg-soft shrink-0 border px-3.5 py-2 text-xs font-semibold"
                >
                    {acceso.label}
                </Link>
            ))}
        </nav>
    );
}
