import type { EventoDia } from './PanelHero';

export interface CriticoItem {
    material: string;
    almacen: string;
    disponible: number;
    minimo: number;
    unidad?: string;
}

export interface RutaItem {
    codigo: string;
    origen: string;
    destino: string;
    km?: number;
}

export interface PanelAsideProps {
    criticos: CriticoItem[];
    rutas: RutaItem[];
    eventos: EventoDia[];
}

function Bloque({
    titulo,
    vacio,
    mensaje,
    children,
}: {
    titulo: string;
    vacio: boolean;
    mensaje: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-tile border-line bg-surface shadow-card border p-4">
            <h3 className="text-body font-semibold tracking-tight">{titulo}</h3>
            {vacio ? (
                <p className="bg-soft text-label text-muted mt-2 rounded-lg px-3 py-4 text-center">
                    {mensaje}
                </p>
            ) : (
                <div className="mt-2 space-y-2">{children}</div>
            )}
        </section>
    );
}

/** Columna lateral del mapa: criticidad, rutas activas y eventos del día. */
export function PanelAside({ criticos, rutas, eventos }: PanelAsideProps) {
    return (
        <div className="flex flex-col gap-[var(--gap)]">
            <Bloque
                titulo="Stock crítico"
                vacio={criticos.length === 0}
                mensaje="Ningún material bajo mínimo"
            >
                {criticos.map((item) => (
                    <div
                        key={`${item.material}-${item.almacen}`}
                        className="text-label flex items-center justify-between gap-2"
                    >
                        <div className="min-w-0">
                            <p className="text-ink truncate font-medium">
                                {item.material}
                            </p>
                            <p className="text-muted truncate">
                                {item.almacen}
                            </p>
                        </div>
                        <span className="rounded-pill bg-critico-soft text-micro text-critico shrink-0 px-2 py-0.5 font-mono font-semibold">
                            {item.disponible.toFixed(1)}
                            {item.unidad ? ` ${item.unidad}` : ''}
                        </span>
                    </div>
                ))}
            </Bloque>

            <Bloque
                titulo="En ruta"
                vacio={rutas.length === 0}
                mensaje="Sin transferencias en tránsito"
            >
                {rutas.map((ruta) => (
                    <div key={ruta.codigo} className="text-label">
                        <p className="text-micro text-muted font-mono">
                            {ruta.codigo}
                        </p>
                        <p className="text-ink truncate font-medium">
                            {ruta.origen} → {ruta.destino}
                        </p>
                        {ruta.km !== undefined && (
                            <p className="text-micro text-muted">
                                {ruta.km.toFixed(1)} km
                            </p>
                        )}
                    </div>
                ))}
            </Bloque>

            <Bloque
                titulo="Actividad de hoy"
                vacio={eventos.length === 0}
                mensaje="Sin movimientos registrados"
            >
                {eventos.map((evento, indice) => (
                    <div
                        key={`${evento.hora}-${indice}`}
                        className="text-label flex items-start gap-2"
                    >
                        <span className="text-micro text-muted shrink-0 font-mono">
                            {evento.hora}
                        </span>
                        <span className="text-ink truncate">
                            {evento.etiqueta}
                        </span>
                    </div>
                ))}
            </Bloque>
        </div>
    );
}
