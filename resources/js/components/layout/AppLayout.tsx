// Layout de la aplicación: navegación dinámica desde navigation.config.ts (Regla 4).
// Menú lateral fijo de 8 módulos + barra superior con selector de rol simulado y obra activa.
// Responsive: sidebar colapsable en móvil (overlay), siempre visible en lg.

import { useEffect, useState, type ReactNode } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { cn } from '../../utils/cn';
import { useAppStore } from '../../store/AppContext';
import { iniciales } from '../../utils/format';
import { useMediaQuery } from '../../hooks/useSimulatedTransit';
import { APP_ROLES, NAVIGATION_CONFIG, type AppRoleId } from '../../navigation.config';
import {
    IconBell,
    IconChevronDown,
    IconMenu,
    IconRefreshCw,
    IconSearch,
    IconX,
} from '../icons';

export function AppLayout({ children }: { children: ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { selectObra } = useAppStore();
    const { url } = usePage();
    const pathname = url.split('?')[0] ?? '/';

    // Obtener título y subtítulo dinámicamente de la configuración
    const currentNav = NAVIGATION_CONFIG.flatMap((g) => g.items).find((item) => item.path === pathname) ?? {
        label: 'Panel General',
        description: 'Supervisión del programa de obras e inventario geolocalizado',
    };

    useEffect(() => {
        const handler = (e: Event) => {
            const customEv = e as CustomEvent<{ obraId: string }>;
            if (customEv.detail?.obraId) {
                selectObra(customEv.detail.obraId);
            }
        };
        window.addEventListener('cpm:set-obra-activa', handler);
        return () => window.removeEventListener('cpm:set-obra-activa', handler);
    }, [selectObra]);

    return (
        <div className="min-h-screen bg-canvas text-ink">
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} pathname={pathname} />
            <div className="flex min-h-screen flex-col lg:pl-72">
                <Topbar
                    onMenu={() => setSidebarOpen(true)}
                    titulo={currentNav.label}
                    subtitulo={currentNav.description}
                />
                <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
            </div>
        </div>
    );
}

/* ---------------------------- Sidebar ---------------------------- */

function Sidebar({ open, onClose, pathname }: { open: boolean; onClose: () => void; pathname: string }) {
    return (
        <>
            <div
                className={cn(
                    'fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm transition-opacity lg:hidden',
                    open ? 'opacity-100' : 'pointer-events-none opacity-0',
                )}
                onClick={onClose}
            />
            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-line bg-surface p-5 transition-transform duration-200 lg:translate-x-0',
                    open ? 'translate-x-0' : '-translate-x-full',
                )}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-500 font-display text-lg font-bold text-white shadow-pop">
                            PM
                        </span>
                        <div>
                            <h1 className="font-display text-sm font-bold tracking-tight text-ink">Pillco Marca</h1>
                            <p className="text-[11px] font-medium text-muted">Consorcio Constructor</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-muted hover:bg-soft hover:text-ink lg:hidden"
                        aria-label="Cerrar menú"
                    >
                        <IconX size={20} />
                    </button>
                </div>

                <nav className="mt-6 flex flex-1 flex-col gap-5 overflow-y-auto">
                    {NAVIGATION_CONFIG.map((group) => (
                        <div key={group.id} className="flex flex-col gap-1">
                            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted">
                                {group.label}
                            </p>
                            {group.items.map((item) => {
                                const IconComponent = item.icon;
                                const isActive = pathname === item.path;
                                return (
                                    <Link
                                        key={item.id}
                                        href={item.path}
                                        onClick={onClose}
                                        className={cn(
                                            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                                            isActive
                                                ? 'bg-brand-500 text-white shadow-pop'
                                                : 'text-ink/75 hover:bg-soft hover:text-ink',
                                        )}
                                    >
                                        <IconComponent size={18} />
                                        <span className="truncate">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                <footer className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-soft/70 px-3 py-2.5 text-xs text-muted">
                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-ok" />
                        <span className="font-medium text-ink/80">Red Logística Mantaro</span>
                    </div>
                    <span className="text-[10px] font-bold text-muted">PMI / PMU</span>
                </footer>
            </aside>
        </>
    );
}

/* ---------------------------- Topbar ---------------------------- */

function Topbar({ onMenu, titulo, subtitulo }: { onMenu: () => void; titulo: string; subtitulo: string }) {
    const { obraActiva, obras, selectObra, rolActivo, setRolActivo, resetAllData } = useAppStore();
    const [obraMenu, setObraMenu] = useState(false);
    const [rolMenu, setRolMenu] = useState(false);
    const md = useMediaQuery('(min-width: 1024px)');

    const currentRol = APP_ROLES.find((r) => r.id === rolActivo) ?? APP_ROLES[1];

    return (
        <header className="sticky top-0 z-20 border-b border-line bg-surface/85 backdrop-blur">
            <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
                <button
                    className="rounded-md p-1.5 text-ink/70 hover:bg-soft lg:hidden"
                    onClick={onMenu}
                    aria-label="Abrir menú"
                >
                    <IconMenu size={20} />
                </button>

                <div className="min-w-0">
                    <h1 className="truncate font-display text-lg font-semibold leading-tight text-ink">{titulo}</h1>
                    <p className="hidden truncate text-xs text-muted sm:block">{subtitulo}</p>
                </div>

                <div className="ml-auto flex items-center gap-2">
                    {md && (
                        <div className="hidden items-center gap-2 rounded-field border border-line bg-canvas px-3 py-1.5 text-sm text-muted xl:flex">
                            <IconSearch size={15} />
                            <input
                                className="w-36 bg-transparent text-ink outline-none placeholder:text-muted/70"
                                placeholder="Buscar en el sistema…"
                                aria-label="Buscador global"
                            />
                        </div>
                    )}

                    {/* Botón de restablecer datos iniciales */}
                    <button
                        onClick={() => {
                            if (window.confirm('¿Deseas restablecer todos los datos iniciales de stock y operaciones?')) {
                                resetAllData();
                            }
                        }}
                        title="Restablecer datos iniciales del mock"
                        className="flex items-center gap-1.5 rounded-field border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-soft hover:text-ink"
                    >
                        <IconRefreshCw size={13} />
                        <span className="hidden sm:inline">Restablecer</span>
                    </button>

                    {/* Selector de Rol Activo */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                setRolMenu((v) => !v);
                                setObraMenu(false);
                            }}
                            className="flex items-center gap-1.5 rounded-field border border-brand-200 bg-brand-50/70 px-2.5 py-1.5 text-xs font-semibold text-brand-800 transition-colors hover:bg-brand-100"
                        >
                            <currentRol.icon size={15} className="shrink-0 text-brand-600" />
                            <span className="max-w-28 truncate sm:max-w-none">{currentRol.nombre}</span>
                            <IconChevronDown size={13} className="text-brand-600" />
                        </button>

                        {rolMenu && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setRolMenu(false)} />
                                <div className="absolute right-0 z-20 mt-1 w-64 overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-pop">
                                    <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted">
                                        Simular Rol Activo
                                    </p>
                                    {APP_ROLES.map((r) => {
                                        const RoleIcon = r.icon;
                                        return (
                                            <button
                                                key={r.id}
                                                onClick={() => {
                                                    setRolActivo(r.id as AppRoleId);
                                                    setRolMenu(false);
                                                }}
                                                className={cn(
                                                    'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs',
                                                    r.id === rolActivo
                                                        ? 'bg-brand-50 font-semibold text-brand-700'
                                                        : 'hover:bg-soft text-ink',
                                                )}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <RoleIcon size={16} className="shrink-0 text-brand-600" />
                                                    <span>{r.nombre}</span>
                                                </div>
                                                <span className="rounded bg-soft px-1.5 py-0.5 text-[9px] text-muted">
                                                    {r.badge}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Selector de Obra Activa */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                setObraMenu((v) => !v);
                                setRolMenu(false);
                            }}
                            className="flex max-w-44 items-center gap-1.5 rounded-field border border-line bg-surface py-1.5 pl-2.5 pr-2 text-xs font-medium text-ink transition-colors hover:bg-soft sm:max-w-56"
                        >
                            <span
                                className={cn(
                                    'h-2 w-2 shrink-0 rounded-full',
                                    obraActiva.estado === 'cerrada' ? 'bg-coral' : 'bg-ok',
                                )}
                            />
                            <span className="truncate">{obraActiva.nombre}</span>
                            <IconChevronDown size={13} className="shrink-0 text-muted" />
                        </button>
                        {obraMenu && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setObraMenu(false)} />
                                <div className="absolute right-0 z-20 mt-1 w-64 overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-pop">
                                    <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted">
                                        Frente / Obra activa
                                    </p>
                                    {obras.map((obra) => (
                                        <button
                                            key={obra.id}
                                            onClick={() => {
                                                selectObra(obra.id);
                                                setObraMenu(false);
                                            }}
                                            className={cn(
                                                'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs',
                                                obra.id === obraActiva.id
                                                    ? 'bg-brand-50 font-semibold text-brand-700'
                                                    : 'hover:bg-soft text-ink',
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    'h-2 w-2 shrink-0 rounded-full',
                                                    obra.estado === 'cerrada' ? 'bg-coral' : 'bg-ok',
                                                )}
                                            />
                                            <span className="truncate">{obra.nombre}</span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}