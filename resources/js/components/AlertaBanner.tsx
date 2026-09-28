import type { ReactNode } from 'react';
import { cn } from '../utils/cn';
import { IconAlert, IconArrowUpRight } from './icons';

export function AlertaBanner({
    kind,
    title,
    mensaje,
    actions,
}: {
    kind: 'sobrante' | 'critico' | 'info';
    title: ReactNode;
    mensaje: ReactNode;
    actions?: ReactNode;
}) {
    const styles = {
        sobrante: { border: 'border-violet-300', bg: 'bg-sobrante-soft/60', fg: 'text-violet-800', icon: <IconAlert size={16} /> },
        critico: { border: 'border-orange-300', bg: 'bg-danger-soft/60', fg: 'text-orange-800', icon: <IconAlert size={16} /> },
        info: { border: 'border-brand-200', bg: 'bg-brand-50/60', fg: 'text-brand-800', icon: <IconArrowUpRight size={16} /> },
    }[kind];
    return (
        <div className={cn('rounded-xl border-l-4 p-4', styles.border, styles.bg)}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex gap-3">
                    <span className={cn('mt-0.5', styles.fg)}>{styles.icon}</span>
                    <div>
                        <p className={cn('text-sm font-semibold', styles.fg)}>{title}</p>
                        <p className="mt-0.5 text-[13px] text-ink/80">{mensaje}</p>
                    </div>
                </div>
                {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>
        </div>
    );
}