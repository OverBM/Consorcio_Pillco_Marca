import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../utils/cn';
import { IconX } from './icons';

export { cn };

export function Button({
    children,
    variant = 'primary',
    size = 'md',
    className,
    disabled,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'mint' | 'danger' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    children: ReactNode;
}) {
    const variantStyles = {
        primary: 'btn-primary',
        secondary: 'btn-secondary',
        mint: 'btn-mint',
        danger: 'bg-red-600 text-white hover:bg-red-700 border border-red-700',
        outline: 'btn-secondary',
    };

    const sizeStyles = {
        sm: 'px-2.5 py-1 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-5 py-2.5 text-base',
    };

    return (
        <button
            className={cn(
                'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50',
                variantStyles[variant],
                sizeStyles[size],
                className,
            )}
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    );
}

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
                        {title && (
                            <h3 className="font-display text-ink text-base font-semibold">
                                {title}
                            </h3>
                        )}
                        {subtitle && (
                            <p className="text-muted mt-0.5 text-xs">
                                {subtitle}
                            </p>
                        )}
                    </div>
                    {action}
                </header>
            )}
            {children}
        </section>
    );
}

export function EstadoDot({
    className,
    size = 6,
}: {
    className: string;
    size?: number;
}) {
    return (
        <span
            className={cn('inline-block shrink-0 rounded-full', className)}
            style={{ width: size, height: size }}
        />
    );
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
    return (
        <span className={cn('chip', tones[tone], className)}>{children}</span>
    );
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
            <button
                type="button"
                aria-label="Cerrar modal"
                className="bg-ink/50 absolute inset-0 h-full w-full cursor-default border-0 p-0 backdrop-blur-sm"
                onClick={onClose}
            />
            <div
                className={cn(
                    'panel relative z-10 max-h-[90vh] w-full overflow-y-auto p-6',
                    wide ? 'max-w-3xl' : 'max-w-lg',
                )}
            >
                <header className="mb-4 flex items-start justify-between gap-3">
                    <h3 className="font-display text-ink text-lg font-semibold">
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-muted hover:bg-soft hover:text-ink cursor-pointer rounded-md p-1 transition-colors"
                        aria-label="Cerrar"
                    >
                        <IconX size={18} />
                    </button>
                </header>
                {children}
            </div>
        </div>
    );
}
