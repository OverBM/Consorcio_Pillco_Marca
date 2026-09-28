import type { ReactNode } from 'react';
import { cn } from '../utils/cn';
import { IconX } from './icons';

export { cn };

export function Card({
    title,
    subtitle,
    action,
    children,
    className,
    id,
}: {
    title?: ReactNode;
    subtitle?: ReactNode;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
    id?: string;
}) {
    return (
        <section id={id} className={cn('card p-5', className)}>
            {(title || action) && (
                <header className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        {title && <h3 className="font-display text-base font-semibold text-ink">{title}</h3>}
                        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
                    </div>
                    {action}
                </header>
            )}
            {children}
        </section>
    );
}

export function EstadoDot({ className, size = 6 }: { className: string; size?: number }) {
    return <span className={cn('inline-block shrink-0 rounded-full', className)} style={{ width: size, height: size }} />;
}

export function Badge({
    children,
    tone = 'neutral',
    className,
}: {
    children: ReactNode;
    tone?: 'ok' | 'warn' | 'danger' | 'violet' | 'neutral';
    className?: string;
}) {
    const tones: Record<string, string> = {
        ok: 'bg-ok-soft text-emerald-800',
        warn: 'bg-warn-soft text-amber-800',
        danger: 'bg-danger-soft text-orange-800',
        violet: 'bg-sobrante-soft text-violet-800',
        neutral: 'bg-soft text-slate-700',
    };
    return <span className={cn('chip', tones[tone], className)}>{children}</span>;
}

export function Modal({
    open,
    onClose,
    title,
    children,
    wide,
}: {
    open: boolean;
    onClose: () => void;
    title: ReactNode;
    children: ReactNode;
    wide?: boolean;
}) {
    if (!open) {
        return null;
    }
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} />
            <div className={cn('panel relative z-10 max-h-[90vh] w-full overflow-y-auto p-6', wide ? 'max-w-3xl' : 'max-w-lg')}>
                <header className="mb-4 flex items-start justify-between gap-3">
                    <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
                    <button onClick={onClose} className="rounded-md p-1 text-muted transition-colors hover:bg-soft hover:text-ink" aria-label="Cerrar">
                        <IconX size={18} />
                    </button>
                </header>
                {children}
            </div>
        </div>
    );
}