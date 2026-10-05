import React from 'react';
import { Link } from '@inertiajs/react';
import {
    IconDashboard,
    IconBuilding,
    IconRefresh,
    IconFileText,
    IconTrendingUp,
    IconDollar,
    IconAlertTriangle,
    IconEdit,
    IconFlag,
    IconBox,
    IconInbox,
    IconClipboard,
    IconTruck,
    IconRepeat,
    IconSearch,
    IconTrendingDown,
    IconShoppingCart,
    IconScale,
    IconFileCheck,
    IconUsers,
    IconMapPin,
    IconShield,
    IconSettings,
    IconBrandMark,
} from '@/components/icons/Icons';

export interface NavItem {
    id: string;
    label: string;
    href: string;
    icon?: string;
    badge?: string;
    tone?: 'mint' | 'yellow' | 'default';
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

interface DashboardSidebarProps {
    groups: NavGroup[];
    activeRoute?: string;
    rolNombre?: string;
    rolCodigo?: string;
    onRolChange?: (rol: string) => void;
}

const renderNavIcon = (iconKey?: string) => {
    switch (iconKey) {
        case 'dashboard':
            return <IconDashboard size={16} />;
        case 'building':
            return <IconBuilding size={16} />;
        case 'refresh':
            return <IconRefresh size={16} />;
        case 'file':
            return <IconFileText size={16} />;
        case 'trending-up':
            return <IconTrendingUp size={16} />;
        case 'dollar':
            return <IconDollar size={16} />;
        case 'alert':
            return <IconAlertTriangle size={16} />;
        case 'edit':
            return <IconEdit size={16} />;
        case 'flag':
            return <IconFlag size={16} />;
        case 'box':
            return <IconBox size={16} />;
        case 'inbox':
            return <IconInbox size={16} />;
        case 'clipboard':
            return <IconClipboard size={16} />;
        case 'truck':
            return <IconTruck size={16} />;
        case 'repeat':
            return <IconRepeat size={16} />;
        case 'search':
            return <IconSearch size={16} />;
        case 'trending-down':
            return <IconTrendingDown size={16} />;
        case 'shopping-cart':
            return <IconShoppingCart size={16} />;
        case 'scale':
            return <IconScale size={16} />;
        case 'file-check':
            return <IconFileCheck size={16} />;
        case 'users':
            return <IconUsers size={16} />;
        case 'map-pin':
            return <IconMapPin size={16} />;
        case 'shield':
            return <IconShield size={16} />;
        case 'settings':
            return <IconSettings size={16} />;
        default:
            return <IconBox size={16} />;
    }
};

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
    groups,
    activeRoute = '',
    rolNombre = 'Residente de Obra',
}) => {
    return (
        <aside className="w-64 min-h-screen bg-[#000000] text-white flex flex-col p-4 border-r border-[#222222] flex-shrink-0 select-none">
            {/* Brand Header */}
            <a
                href="/"
                className="flex items-center gap-3 pb-6 border-b border-[#222222] hover:opacity-90 transition-opacity focus:outline-none focus:ring-1 focus:ring-[#d1ffca] rounded"
                title="Ir al inicio"
            >
                <IconBrandMark size={36} />
                <div className="flex flex-col">
                    <span className="font-mono text-[9px] text-[#888888] tracking-widest uppercase">
                        Valle del Mantaro
                    </span>
                    <strong className="font-display text-base tracking-wide uppercase text-white font-bold leading-none mt-0.5">
                        Consorcio Pillco Marca
                    </strong>
                </div>
            </a>

            {/* Live Indicator Strip */}
            <div className="my-4 py-2 px-3 rounded-lg bg-[#111111] border border-[#222222] flex items-center justify-between text-[11px] font-mono">
                <span className="flex items-center gap-2 text-[#cccccc]">
                    <span className="w-2 h-2 rounded-full bg-[#d1ffca] animate-pulse" />
                    SISTEMA ACTIVO
                </span>
                <span className="text-[#888888] text-[9px]">HUANCAYO</span>
            </div>

            {/* Rol de Usuario */}
            <div className="mb-4 px-2">
                <span className="text-[10px] font-mono text-[#777777] uppercase tracking-wider block">
                    Rol Operativo
                </span>
                <span className="text-xs font-semibold text-[#d1ffca] truncate block mt-0.5">
                    {rolNombre}
                </span>
            </div>

            {/* Navigation Groups */}
            <nav className="flex-1 space-y-6 overflow-y-auto pr-1">
                {groups.map((group, gIdx) => (
                    <div key={gIdx} className="space-y-1.5">
                        <div className="px-2 text-[10px] font-mono uppercase tracking-widest text-[#777777]">
                            {group.title}
                        </div>
                        <ul className="space-y-1">
                            {group.items.map((item) => {
                                const isCurrent = activeRoute === item.href || (item.href !== '/' && activeRoute.startsWith(item.href));
                                return (
                                    <li key={item.id}>
                                        <Link
                                            href={item.href}
                                            className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                                isCurrent
                                                    ? 'bg-[#d1ffca] text-[#000000] font-bold shadow-sm'
                                                    : 'text-[#bbbbbb] hover:bg-[#1a1a1a] hover:text-white'
                                            }`}
                                        >
                                            <span className="flex items-center gap-2.5 truncate">
                                                <span className="opacity-80 flex-shrink-0">
                                                    {renderNavIcon(item.icon)}
                                                </span>
                                                <span className="truncate">{item.label}</span>
                                            </span>
                                            {item.badge && (
                                                <span
                                                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${
                                                        item.tone === 'yellow'
                                                            ? 'bg-[#fff100] text-black font-bold'
                                                            : item.tone === 'mint'
                                                            ? 'bg-[#d1ffca] text-black font-bold'
                                                            : 'bg-[#262626] text-[#aaaaaa]'
                                                    }`}
                                                >
                                                    {item.badge}
                                                </span>
                                            )}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>

            {/* Footer Status */}
            <div className="pt-4 mt-auto border-t border-[#222222] text-[10px] font-mono text-[#666666] flex justify-between items-center">
                <span>SICAAO · V3.0</span>
                <span>PMI / PMU</span>
            </div>
        </aside>
    );
};
