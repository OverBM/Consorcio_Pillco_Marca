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
    IconChevronLeft,
    IconChevronRight,
} from '@/components/icons/Icons';
import { resolveActiveHref } from '@/utils/navigation';

export interface NavItem {
    id: string;
    label: string;
    href: string;
    icon?: string;
    badge?: string;
    tone?: 'mint' | 'yellow' | 'default';
    /** Permiso requerido para mostrar/abrir el módulo (p. ej. `pmi.ver`). */
    permiso?: string;
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
    collapsed?: boolean;
    onToggleCollapse?: () => void;
    onNavigate?: () => void;
    className?: string;
}

const renderNavIcon = (iconKey?: string, size = 16) => {
    switch (iconKey) {
        case 'dashboard':
            return <IconDashboard size={size} />;
        case 'building':
            return <IconBuilding size={size} />;
        case 'refresh':
            return <IconRefresh size={size} />;
        case 'file':
            return <IconFileText size={size} />;
        case 'trending-up':
            return <IconTrendingUp size={size} />;
        case 'dollar':
            return <IconDollar size={size} />;
        case 'alert':
            return <IconAlertTriangle size={size} />;
        case 'edit':
            return <IconEdit size={size} />;
        case 'flag':
            return <IconFlag size={size} />;
        case 'box':
            return <IconBox size={size} />;
        case 'inbox':
            return <IconInbox size={size} />;
        case 'clipboard':
            return <IconClipboard size={size} />;
        case 'truck':
            return <IconTruck size={size} />;
        case 'repeat':
            return <IconRepeat size={size} />;
        case 'search':
            return <IconSearch size={size} />;
        case 'trending-down':
            return <IconTrendingDown size={size} />;
        case 'shopping-cart':
            return <IconShoppingCart size={size} />;
        case 'scale':
            return <IconScale size={size} />;
        case 'file-check':
            return <IconFileCheck size={size} />;
        case 'users':
            return <IconUsers size={size} />;
        case 'map-pin':
            return <IconMapPin size={size} />;
        case 'shield':
            return <IconShield size={size} />;
        case 'settings':
            return <IconSettings size={size} />;
        default:
            return <IconBox size={size} />;
    }
};

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
    groups,
    activeRoute = '',
    rolNombre = 'Residente de Obra',
    collapsed = false,
    onToggleCollapse,
    onNavigate,
    className = '',
}) => {
    const activeHref = resolveActiveHref(
        activeRoute,
        groups.flatMap((group) => group.items.map((item) => item.href)),
    );

    const handleNavigate = () => {
        onNavigate?.();
    };

    return (
        <aside
            className={`min-h-screen bg-[#000000] text-white flex flex-col p-4 border-r border-[#222222] flex-shrink-0 select-none transition-[width,transform] duration-200 ${
                collapsed ? 'w-20' : 'w-64'
            } ${className}`}
        >
            {/* Brand Header */}
            <a
                href="/"
                className={`flex items-center gap-3 pb-6 border-b border-[#222222] hover:opacity-90 transition-opacity focus:outline-none focus:ring-1 focus:ring-[#d1ffca] rounded ${
                    collapsed ? 'justify-center' : ''
                }`}
                title="Ir al inicio"
            >
                <IconBrandMark size={36} />
                {!collapsed && (
                    <div className="flex flex-col">
                        <span className="font-mono text-[9px] text-[#888888] tracking-widest uppercase">
                            Valle del Mantaro
                        </span>
                        <strong className="font-display text-base tracking-wide uppercase text-white font-bold leading-none mt-0.5">
                            Consorcio Pillco Marca
                        </strong>
                    </div>
                )}
            </a>

            {/* Live Indicator Strip */}
            {!collapsed && (
                <div className="my-4 py-2 px-3 rounded-lg bg-[#111111] border border-[#222222] flex items-center justify-between text-[11px] font-mono">
                    <span className="flex items-center gap-2 text-[#cccccc]">
                        <span className="w-2 h-2 rounded-full bg-[#d1ffca] animate-pulse" />
                        SISTEMA ACTIVO
                    </span>
                    <span className="text-[#888888] text-[9px]">HUANCAYO</span>
                </div>
            )}

            {/* Rol de Usuario */}
            <div className={`mb-4 ${collapsed ? 'px-0 text-center' : 'px-2'}`}>
                {!collapsed && (
                    <span className="text-[10px] font-mono text-[#777777] uppercase tracking-wider block">
                        Rol Operativo
                    </span>
                )}
                <span
                    className="text-xs font-semibold text-[#d1ffca] truncate block mt-0.5"
                    title={collapsed ? rolNombre : undefined}
                >
                    {collapsed ? rolNombre.charAt(0).toUpperCase() : rolNombre}
                </span>
            </div>

            {/* Navigation Groups */}
            <nav className={`sidebar-scroll flex-1 space-y-6 overflow-y-auto ${collapsed ? 'px-1' : 'pr-1'}`}>
                {groups.map((group, gIdx) => (
                    <div key={gIdx} className="space-y-1.5">
                        {collapsed ? (
                            gIdx > 0 && <div className="mx-auto mb-2 h-px w-8 bg-[#222222]" aria-hidden="true" />
                        ) : (
                            <div className="px-2 text-[10px] font-mono uppercase tracking-widest text-[#777777]">
                                {group.title}
                            </div>
                        )}
                        <ul className="space-y-1">
                            {group.items.map((item) => {
                                const isCurrent = item.href === activeHref;
                                return (
                                    <li key={item.id}>
                                        <Link
                                            href={item.href}
                                            onClick={handleNavigate}
                                            title={collapsed ? item.label : undefined}
                                            aria-label={collapsed ? item.label : undefined}
                                            className={
                                                collapsed
                                                    ? `flex h-10 w-full items-center justify-center rounded-lg transition-all ${
                                                          isCurrent
                                                              ? 'bg-[#d1ffca] text-[#000000] shadow-sm'
                                                              : 'text-[#bbbbbb] hover:bg-[#1a1a1a] hover:text-white'
                                                      }`
                                                    : `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                                          isCurrent
                                                              ? 'bg-[#d1ffca] text-[#000000] font-bold shadow-sm'
                                                              : 'text-[#bbbbbb] hover:bg-[#1a1a1a] hover:text-white'
                                                      }`
                                            }
                                        >
                                            {collapsed ? (
                                                <span className="flex-shrink-0">
                                                    {renderNavIcon(item.icon, 18)}
                                                </span>
                                            ) : (
                                                <>
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
                                                </>
                                            )}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>

            {/* Footer Status + Collapse Toggle */}
            <div className="pt-4 mt-auto border-t border-[#222222] space-y-3">
                {onToggleCollapse && (
                    <button
                        type="button"
                        onClick={onToggleCollapse}
                        aria-label={collapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
                        aria-expanded={!collapsed}
                        title={collapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#d1ffca] px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-[#000000] shadow-sm transition-colors hover:bg-[#b8f5b0] focus:outline-none focus:ring-2 focus:ring-[#d1ffca] focus:ring-offset-2 focus:ring-offset-[#000000]"
                    >
                        {collapsed ? <IconChevronRight size={16} /> : <IconChevronLeft size={16} />}
                        {!collapsed && <span>Contraer menú</span>}
                    </button>
                )}
                {!collapsed && (
                    <div className="text-[10px] font-mono text-[#666666] flex justify-between items-center">
                        <span>SICAAO · V3.0</span>
                        <span>PMI / PMU</span>
                    </div>
                )}
            </div>
        </aside>
    );
};
