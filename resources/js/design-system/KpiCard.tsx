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
            className={`min-h-[135px] p-4 flex flex-col rounded-[16px] transition-all ${
                isDark
                    ? 'bg-[#000000] text-white border border-black shadow-md'
                    : isAlert
                    ? 'bg-white text-black border-t-4 border-t-[#fff100] border-x border-b border-[#c6c6c6]/50 shadow-sm'
                    : 'bg-white text-black border border-[#c6c6c6]/50 shadow-sm'
            } ${className}`}
        >
            <div className="flex items-center justify-between text-[11px] font-mono tracking-wider uppercase opacity-75">
                <span>{title}</span>
                {iconGlyph && (
                    <span className={`text-base ${isAlert ? 'text-[#000000] bg-[#fff100] px-1.5 py-0.5 rounded-full' : ''}`}>
                        {iconGlyph}
                    </span>
                )}
            </div>

            <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-4xl font-bold tracking-tight">
                    {value}
                </span>
                {unit && (
                    <span className="font-mono text-xs opacity-75">
                        {unit}
                    </span>
                )}
            </div>

            <div className="mt-auto pt-3 flex items-center justify-between text-xs font-mono">
                {delta && (
                    <span
                        className={`font-semibold ${
                            deltaType === 'positive'
                                ? isDark ? 'text-[#d1ffca]' : 'text-emerald-700'
                                : deltaType === 'negative'
                                ? 'text-rose-600'
                                : 'opacity-70'
                        }`}
                    >
                        {delta}
                    </span>
                )}
                {footNote && (
                    <span className="opacity-60 text-[10px] ml-auto">
                        {footNote}
                    </span>
                )}
            </div>
        </div>
    );
};
