import React from 'react';
import { IconBell } from '@/components/icons/Icons';

interface HeaderBarProps {
    title: string;
    breadcrumb?: string[];
    subtitle?: string;
    onNotificationClick?: () => void;
    notificationCount?: number;
    userName?: string;
    userInitials?: string;
    actions?: React.ReactNode;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
    title,
    breadcrumb = ['PANEL', 'OPERACIONES', 'VALLE DEL MANTARO'],
    subtitle,
    notificationCount = 0,
    userName = 'Residente de Obra',
    userInitials = 'RO',
    actions,
}) => {
    return (
        <header className="mb-6 pb-4 border-b border-[#c6c6c6]/60">
            {/* Breadcrumb Monospaciado */}
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#666666] tracking-wider uppercase mb-1">
                {breadcrumb.map((crumb, idx) => (
                    <React.Fragment key={idx}>
                        <span>{crumb}</span>
                        {idx < breadcrumb.length - 1 && <span className="text-[#999999]">/</span>}
                    </React.Fragment>
                ))}
            </div>

            {/* Header Content */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="font-display text-4xl md:text-5xl font-extrabold text-[#000000] tracking-tight uppercase leading-none">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="mt-1.5 text-xs text-[#444444] font-normal">
                            {subtitle}
                        </p>
                    )}
                </div>

                {/* Actions & Tools */}
                <div className="flex items-center gap-3">
                    {actions}

                    {/* Environment Pill */}
                    <div className="px-3 py-1 rounded-full bg-[#d1ffca] text-[#000000] text-[10px] font-mono font-bold flex items-center gap-1.5 border border-[#b2e5aa]">
                        <span className="w-1.5 h-1.5 rounded-full bg-black" />
                        HUANCAYO · EN LÍNEA
                    </div>

                    {/* Notification Icon */}
                    <div className="relative p-2 rounded-lg bg-white border border-[#c6c6c6] text-[#444444] cursor-pointer hover:bg-[#f3f3f3] transition-colors flex items-center justify-center">
                        <IconBell size={16} />
                        {notificationCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#fff100] text-[#000000] font-mono text-[9px] font-bold flex items-center justify-center border border-black">
                                {notificationCount}
                            </span>
                        )}
                    </div>

                    {/* User Profile Tag */}
                    <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white border border-[#c6c6c6]">
                        <div className="w-7 h-7 rounded-full bg-[#000000] text-[#ffffff] font-mono text-xs font-bold flex items-center justify-center">
                            {userInitials}
                        </div>
                        <span className="text-xs font-medium text-[#000000] hidden sm:inline">
                            {userName}
                        </span>
                    </div>
                </div>
            </div>
        </header>
    );
};
