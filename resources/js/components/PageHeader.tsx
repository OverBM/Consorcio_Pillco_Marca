import type { ReactNode } from 'react';

export function PageHeader({
    title,
    subtitle,
    actions,
    action,
}: {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
    action?: ReactNode;
}) {
    const headerActions = actions ?? action;
    return (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
                <h2 className="font-display text-xl font-bold tracking-tight text-ink">{title}</h2>
                {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
            </div>
            {headerActions && <div className="flex flex-wrap items-center gap-2">{headerActions}</div>}
        </div>
    );
}