import type { ReactNode } from 'react';

import { PageHeader } from '../components/PageHeader';

export interface PageShellProps {
    title: string;
    subtitle?: string;
    breadcrumb?: string[];
    estado?: {
        label: string;
        tone?: 'exito' | 'atencion' | 'critico' | 'neutral';
    };
    actions?: ReactNode;
    children: ReactNode;
}

const TONOS: Record<string, string> = {
    exito: 'bg-exito-soft text-exito',
    atencion: 'bg-atencion-soft text-atencion',
    critico: 'bg-critico-soft text-critico',
    neutral: 'bg-soft text-muted',
};

/**
 * Plantilla de página: encabezado, acciones y contenido con el ritmo del
 * rediseño. Las páginas no definen márgenes ni paddings propios de layout.
 */
export function PageShell({
    title,
    subtitle,
    breadcrumb,
    estado,
    actions,
    children,
}: PageShellProps) {
    return (
        <div className="mx-auto flex w-full max-w-[var(--app-max)] flex-col gap-[var(--gap)] py-4">
            {breadcrumb && breadcrumb.length > 0 && (
                <nav aria-label="Ruta de navegación">
                    <ol className="text-muted flex flex-wrap items-center gap-1.5 text-[11px]">
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
            <PageHeader
                title={title}
                {...(subtitle !== undefined ? { subtitle } : {})}
                actions={
                    (estado || actions) && (
                        <div className="flex items-center gap-2">
                            {estado && (
                                <span
                                    className={`rounded-pill px-3 py-1.5 text-xs font-semibold ${TONOS[estado.tone ?? 'neutral']}`}
                                >
                                    {estado.label}
                                </span>
                            )}
                            {actions}
                        </div>
                    )
                }
            />
            {children}
        </div>
    );
}

/** Fila de indicadores: 1 a 4 tiles, responsive. */
export function KpiRow({ children }: { children: ReactNode }) {
    return (
        <section className="grid grid-cols-1 gap-[var(--gap)] sm:grid-cols-2 xl:grid-cols-4">
            {children}
        </section>
    );
}

/** Grilla principal + lateral (8/4 en escritorio, una columna en móvil). */
export function SplitGrid({
    principal,
    lateral,
}: {
    principal: ReactNode;
    lateral?: ReactNode;
}) {
    return (
        <section className="grid grid-cols-1 gap-[var(--gap)] lg:grid-cols-12">
            <div className="lg:col-span-8">{principal}</div>
            {lateral && <div className="lg:col-span-4">{lateral}</div>}
        </section>
    );
}

export interface DataSectionProps {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
    children: ReactNode;
    vacio?: boolean;
    mensajeVacio?: string;
}

/** Sección de datos con título, acciones y estado vacío consistente. */
export function DataSection({
    title,
    subtitle,
    actions,
    children,
    vacio = false,
    mensajeVacio = 'Sin datos para mostrar',
}: DataSectionProps) {
    return (
        <article className="rounded-card border-line bg-surface shadow-card border p-5">
            <header className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-title font-semibold tracking-tight">
                        {title}
                    </h2>
                    {subtitle && (
                        <p className="text-muted mt-0.5 text-xs">{subtitle}</p>
                    )}
                </div>
                {actions && <div className="shrink-0">{actions}</div>}
            </header>
            {vacio ? (
                <p className="rounded-tile bg-soft text-muted px-4 py-8 text-center text-sm">
                    {mensajeVacio}
                </p>
            ) : (
                children
            )}
        </article>
    );
}
