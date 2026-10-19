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
                <h2 className="font-display text-ink text-xl font-bold tracking-tight">
                    {title}
                </h2>
                {subtitle && (
                    <p className="text-muted mt-0.5 text-sm">{subtitle}</p>
                )}
            </div>
            {headerActions && (
                <div className="flex flex-wrap items-center gap-2">
                    {headerActions}
                </div>
            )}
        </div>
    );
}
