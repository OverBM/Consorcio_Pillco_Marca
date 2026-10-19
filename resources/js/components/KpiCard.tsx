import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

export function KpiCard({
    icon,
    label,
    value,
    unit,
    hint,
    tone = 'indigo',
}: {
    icon: ReactNode;
    label: string;
    value: ReactNode;
    unit?: string;
    hint?: ReactNode;
    tone?: 'indigo' | 'ok' | 'danger' | 'violet';
}) {
    const tones: Record<string, string> = {
        indigo: 'bg-brand-50 text-brand-600',
        ok: 'bg-ok-soft text-emerald-700',
        danger: 'bg-danger-soft text-orange-700',
        violet: 'bg-sobrante-soft text-violet-700',
    };
    return (
        <div className="card flex items-center gap-4 p-5">
            <div
                className={cn(
                    'grid h-12 w-12 shrink-0 place-items-center rounded-xl',
                    tones[tone],
                )}
            >
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-muted truncate text-[13px] font-medium">
                    {label}
                </p>
                <p className="mt-0.5 flex items-baseline gap-1.5">
                    <span className="num font-display text-ink text-2xl font-bold">
                        {value}
                    </span>
                    {unit && (
                        <span className="text-muted text-xs font-medium">
                            {unit}
                        </span>
                    )}
                </p>
                {hint && (
                    <p className="text-muted mt-0.5 truncate text-xs">{hint}</p>
                )}
            </div>
        </div>
    );
}
