import React from 'react';

export type BadgeTone = 'mint' | 'yellow' | 'dark' | 'smoke' | 'danger';

interface StatusBadgeProps {
    label: string;
    tone?: BadgeTone;
    dot?: boolean;
    className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
    label,
    tone = 'mint',
    dot = true,
    className = '',
}) => {
    const toneClasses = {
        mint: 'bg-[#d1ffca] text-[#000000] border border-[#b2e5aa]',
        yellow: 'bg-[#fff100] text-[#000000] border border-[#ded200]',
        dark: 'bg-[#000000] text-[#ffffff] border border-black',
        smoke: 'bg-[#f3f3f3] text-[#444444] border border-[#c6c6c6]',
        danger: 'bg-rose-100 text-rose-900 border border-rose-300',
    };

    const dotColors = {
        mint: 'bg-emerald-600',
        yellow: 'bg-amber-600',
        dark: 'bg-[#d1ffca]',
        smoke: 'bg-[#666666]',
        danger: 'bg-rose-600',
    };

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-medium tracking-tight ${toneClasses[tone]} ${className}`}
        >
            {dot && (
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColors[tone]}`} />
            )}
            <span>{label}</span>
        </span>
    );
};
