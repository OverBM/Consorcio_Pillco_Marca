import type { ReactNode } from 'react';

export interface PageHeaderProps {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
    action?: ReactNode;
    breadcrumb?: string[];
    estado?: {
        label: string;
        tone?: 'exito' | 'atencion' | 'critico' | 'neutral';
    };
}

const TONOS: Record<string, string> = {
    exito: 'bg-exito-soft text-exito',
    atencion: 'bg-atencion-soft text-atencion',
    critico: 'bg-critico-soft text-critico',
    neutral: 'bg-soft text-muted',
};

/**
 * Encabezado de página del rediseño: ruta opcional, título display, subtítulo
 * y acciones alineadas a la derecha.
 */
export function PageHeader({
    title,
    subtitle,
    actions,
    action,
    breadcrumb,
    estado,
}: PageHeaderProps) {
    const headerActions = actions ?? action;

    return (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
                {breadcrumb && breadcrumb.length > 0 && (
                    <nav aria-label="Ruta de navegación">
                        <ol className="text-muted mb-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                            {breadcrumb.map((miga, indice) => (
                                <li
                                    key={`${miga}-${indice}`}
                                    className="flex items-center gap-1.5"
                                >
                                    {indice > 0 && (
                                        <span aria-hidden="true">›</span>
                                    )}
                                    <span
                                        className={
                                            indice === breadcrumb.length - 1
                                                ? 'text-ink font-semibold'
                                                : ''
                                        }
                                    >
                                        {miga}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </nav>
                )}

                <h2 className="font-display text-ink text-heading sm:text-display font-bold tracking-tight">
                    {title}
                </h2>

                {subtitle && (
                    <p className="text-muted mt-1 max-w-3xl text-sm">
                        {subtitle}
                    </p>
                )}
            </div>

            {(headerActions || estado) && (
                <div className="flex flex-wrap items-center gap-2">
                    {estado && (
                        <span
                            className={`rounded-pill px-3 py-1.5 text-xs font-semibold ${TONOS[estado.tone ?? 'neutral']}`}
                        >
                            {estado.label}
                        </span>
                    )}
                    {headerActions}
                </div>
            )}
        </div>
    );
}
