import { motion } from 'motion/react';

export interface TabOpcion {
    id: string;
    label: string;
}

export interface SegmentedTabsProps {
    opciones: TabOpcion[];
    activo: string;
    onChange: (id: string) => void;
    etiqueta: string;
    /** Identificador único del grupo de tabs en la página. */
    grupo?: string;
}

/**
 * Tercer nivel de navegación: vistas internas de una página.
 * No cambia la URL; el estado vive en la página que lo usa.
 */
export function SegmentedTabs({
    opciones,
    activo,
    onChange,
    etiqueta,
    grupo = 'vista',
}: SegmentedTabsProps) {
    return (
        <div
            role="tablist"
            aria-label={etiqueta}
            className="rounded-pill border-line bg-surface inline-flex items-center gap-1 border p-1"
        >
            {opciones.map((opcion) => {
                const seleccionado = opcion.id === activo;

                return (
                    <button
                        key={opcion.id}
                        type="button"
                        role="tab"
                        aria-selected={seleccionado}
                        onClick={() => onChange(opcion.id)}
                        className={`rounded-pill focus-visible:ring-brand-500 relative px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                            seleccionado
                                ? 'text-ink'
                                : 'text-muted hover:text-ink'
                        }`}
                    >
                        {seleccionado && (
                            <motion.span
                                layoutId={`segmented-${grupo}`}
                                className="rounded-pill bg-soft absolute inset-0"
                                transition={{
                                    type: 'spring',
                                    stiffness: 400,
                                    damping: 34,
                                }}
                            />
                        )}
                        <span className="relative z-10">{opcion.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
