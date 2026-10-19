import React from 'react';

export type KpiVariant = 'standard' | 'dark' | 'alert';

interface KpiCardProps {
    title: string;
    value: string | number;
    unit?: string;
    delta?: string;
    deltaType?: 'positive' | 'negative' | 'neutral';
    variant?: KpiVariant;
    iconGlyph?: string;
    footNote?: string;
    className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
    title,
    value,
    unit,
    delta,
    deltaType = 'neutral',
    variant = 'standard',
    iconGlyph,
    footNote,
    className = '',
}) => {
    const isDark = variant === 'dark';
    const isAlert = variant === 'alert';

    return (
        <div
            className={`flex min-h-[135px] flex-col rounded-[16px] p-4 transition-all ${
                isDark
                    ? 'border border-black bg-[#000000] text-white shadow-md'
                    : isAlert
                      ? 'border-x border-t-4 border-b border-[#c6c6c6]/50 border-t-[#fff100] bg-white text-black shadow-sm'
                      : 'border border-[#c6c6c6]/50 bg-white text-black shadow-sm'
            } ${className}`}
        >
            <div className="flex items-center justify-between font-mono text-[11px] tracking-wider uppercase opacity-75">
                <span>{title}</span>
                {iconGlyph && (
                    <span
                        className={`text-base ${isAlert ? 'rounded-full bg-[#fff100] px-1.5 py-0.5 text-[#000000]' : ''}`}
                    >
                        {iconGlyph}
                    </span>
                )}
            </div>

            <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-4xl font-bold tracking-tight">
                    {value}
                </span>
                {unit && (
                    <span className="font-mono text-xs opacity-75">{unit}</span>
                )}
            </div>

            <div className="mt-auto flex items-center justify-between pt-3 font-mono text-xs">
                {delta && (
                    <span
                        className={`font-semibold ${deltaType === 'positive' ? (isDark ? 'text-[#d1ffca]' : 'text-emerald-700') : deltaType === 'negative' ? 'text-rose-600' : 'opacity-70'}`}
                    >
                        {delta}
                    </span>
                )}
                {footNote && (
                    <span className="ml-auto text-[10px] opacity-60">
                        {footNote}
                    </span>
                )}
            </div>
        </div>
    );
};
