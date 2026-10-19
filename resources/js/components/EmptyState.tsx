import type { ReactNode } from 'react';
import { IconBoxes } from './icons';

export function EmptyState({
    icon,
    title,
    hint,
}: {
    icon?: ReactNode;
    title: string;
    hint?: string;
}) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <span className="text-muted">
                {icon ?? <IconBoxes size={28} />}
            </span>
            <p className="text-ink text-sm font-medium">{title}</p>
            {hint && <p className="text-muted max-w-sm text-xs">{hint}</p>}
        </div>
    );
}
