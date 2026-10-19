import { useEffect, useState, type ReactNode } from 'react';
import { router, usePage } from '@inertiajs/react';
import { DashboardSidebar } from '../../design-system/DashboardSidebar';
import { HeaderBar } from '../../design-system/HeaderBar';
import {
    APP_ROLES,
    NAVIGATION_CONFIG,
    filtrarNavegacion,
} from '../../navigation.config';
import contexto from '@/routes/contexto';

const SIDEBAR_PREF_KEY = 'cicaao.sidebar.collapsed';

function iniciales(nombre: string): string {
    const partes = nombre.trim().split(/\s+/).filter(Boolean);

    if (partes.length === 0) {
        return 'U';
    }

    if (partes.length === 1) {
        return partes[0].slice(0, 2).toUpperCase();
    }

    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function leerPreferenciaContraido(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    return window.localStorage.getItem(SIDEBAR_PREF_KEY) === '1';
}

export function AppLayout({ children }: { children: ReactNode }) {
    const { url, props } = usePage();
    const pathname = url.split('?')[0] ?? '/';
    const [obraMenuOpen, setObraMenuOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(
        leerPreferenciaContraido,
    );

    const usuario = props.auth.user;
    const obras = props.catalogos.obras;
    const obraActiva =
        obras.find((o) => o.id === props.contexto.obra_activa_id) ??
        obras[0] ??
        null;

    const rolCodigo = usuario?.roles[0]?.codigo ?? '';
    const currentRol: { id: string; nombre: string; badge: string } =
        APP_ROLES.find((r) => r.id === rolCodigo) ?? {
            id: rolCodigo || 'residente_obra',
            nombre: usuario?.roles[0]?.nombre ?? 'Usuario',
            badge: usuario ? iniciales(usuario.name) : 'U',
        };

    const permisos = usuario?.permisos ?? [];
    const navegacion = filtrarNavegacion(permisos);

    const userName = usuario?.name ?? 'Usuario';
    const userInitials = iniciales(userName);

    // Buscar el item de navegación actual para migas de pan y título
    const currentItem = NAVIGATION_CONFIG.flatMap((g) => g.items).find(
        (i) => i.href === pathname,
    ) ?? {
        id: 'panel-general',
        label: 'Panel General',
        href: '/',
    };

    // Cerrar el drawer móvil con la tecla Escape
    useEffect(() => {
        if (!sidebarOpen) {
            return;
        }

        const alPresionarTecla = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') {
                setSidebarOpen(false);
            }
        };

        window.addEventListener('keydown', alPresionarTecla);

        return () => window.removeEventListener('keydown', alPresionarTecla);
    }, [sidebarOpen]);

    const alternarSidebarContraido = (): void => {
        setSidebarCollapsed((anterior) => {
            const siguiente = !anterior;

            if (typeof window !== 'undefined') {
                window.localStorage.setItem(
                    SIDEBAR_PREF_KEY,
                    siguiente ? '1' : '0',
                );
            }

            return siguiente;
        });
    };

    const cambiarObra = (obraId: number): void => {
        router.post(
            contexto.update.url(),
            { obra_activa_id: obraId },
            { preserveScroll: true, preserveState: true },
        );
        setObraMenuOpen(false);
    };

    const cerrarSesion = (): void => {
        router.post('/logout');
    };

    return (
        <div className="flex min-h-screen bg-[#e5e5e5] font-sans text-[#000000] antialiased">
            {/* Overlay del drawer móvil */}
            {sidebarOpen && (
                <button
                    type="button"
                    aria-label="Cerrar menú de navegación"
                    onClick={() => setSidebarOpen(false)}
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                />
            )}

            {/* ObraFlow Sidebar */}
            <DashboardSidebar
                groups={navegacion}
                activeRoute={pathname}
                rolNombre={currentRol.nombre}
                rolCodigo={currentRol.id}
                collapsed={sidebarCollapsed}
                onToggleCollapse={alternarSidebarContraido}
                onNavigate={() => setSidebarOpen(false)}
                className={`fixed inset-y-0 left-0 z-50 lg:sticky lg:top-0 lg:z-auto lg:h-screen ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
            />

            {/* Main Area */}
            <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex-1 p-4 sm:p-6 md:p-8">
                    <HeaderBar
                        title={currentItem.label}
                        breadcrumb={[
                            'CONSORCIO PILLCO MARCA',
                            'VALLE DEL MANTARO',
                            currentItem.label.toUpperCase(),
                        ]}
                        userName={userName}
                        userInitials={userInitials}
                        onMenuClick={() => setSidebarOpen(true)}
                        onLogout={cerrarSesion}
                        actions={
                            <div className="flex items-center gap-2">
                                {/* Selector de Obra Activa */}
                                <div className="relative">
                                    <button
                                        onClick={() =>
                                            setObraMenuOpen(!obraMenuOpen)
                                        }
                                        className="flex max-w-[60vw] items-center gap-1.5 rounded-lg border border-[#c6c6c6] bg-white px-3 py-1.5 font-mono text-xs font-semibold text-black shadow-sm hover:bg-[#f3f3f3] sm:max-w-none"
                                    >
                                        <span className="h-2 w-2 shrink-0 rounded-full bg-[#d1ffca]" />
                                        <span className="truncate">
                                            OBRA:{' '}
                                            {obraActiva?.nombre ??
                                                'Sin asignar'}
                                        </span>
                                        <span className="text-[10px]">▼</span>
                                    </button>
                                    {obraMenuOpen && (
                                        <>
                                            <button
                                                type="button"
                                                aria-label="Cerrar menú de obra"
                                                className="fixed inset-0 z-20 h-full w-full cursor-default border-0 bg-transparent p-0"
                                                onClick={() =>
                                                    setObraMenuOpen(false)
                                                }
                                            />
                                            <div className="absolute right-0 z-30 mt-1 w-64 space-y-1 rounded-xl border border-[#c6c6c6] bg-white p-1.5 shadow-lg">
                                                <div className="px-2 py-1 font-mono text-[10px] text-[#888888] uppercase">
                                                    Seleccionar Frente / Obra
                                                </div>
                                                {obras.map((o) => (
                                                    <button
                                                        key={o.id}
                                                        onClick={() =>
                                                            cambiarObra(o.id)
                                                        }
                                                        className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium ${
                                                            o.id ===
                                                            obraActiva?.id
                                                                ? 'bg-[#d1ffca] font-bold text-black'
                                                                : 'text-[#333333] hover:bg-[#f3f3f3]'
                                                        }`}
                                                    >
                                                        <span className="h-1.5 w-1.5 rounded-full bg-black" />
                                                        <span className="truncate">
                                                            {o.nombre}
                                                        </span>
                                                    </button>
                                                ))}
                                                {obras.length === 0 && (
                                                    <div className="px-2.5 py-1.5 text-xs text-[#888888]">
                                                        No tiene obras
                                                        asignadas.
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        }
                    />

                    {/* Page Content */}
                    <main className="min-w-0">{children}</main>
                </div>
            </div>
        </div>
    );
}
