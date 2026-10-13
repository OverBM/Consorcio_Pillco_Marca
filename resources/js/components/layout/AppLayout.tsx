import { useState, type ReactNode } from 'react';
import { router, usePage } from '@inertiajs/react';
import { DashboardSidebar } from '../../design-system/DashboardSidebar';
import { HeaderBar } from '../../design-system/HeaderBar';
import { NAVIGATION_CONFIG } from '../../navigation.config';
import { APP_ROLES } from '../../navigation.config';
import contexto from '@/routes/contexto';

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

export function AppLayout({ children }: { children: ReactNode }) {
    const { url, props } = usePage();
    const pathname = url.split('?')[0] ?? '/';
    const [obraMenuOpen, setObraMenuOpen] = useState(false);

    const usuario = props.auth.user;
    const obras = props.catalogos.obras;
    const obraActiva = obras.find((o) => o.id === props.contexto.obra_activa_id) ?? obras[0] ?? null;

    const rolCodigo = usuario?.roles[0]?.codigo ?? '';
    const currentRol = APP_ROLES.find((r) => r.id === rolCodigo) ?? {
        id: rolCodigo || 'residente_obra',
        nombre: usuario?.roles[0]?.nombre ?? 'Usuario',
        badge: usuario ? iniciales(usuario.name) : 'U',
    };

    const userName = usuario?.name ?? 'Usuario';
    const userInitials = iniciales(userName);

    // Buscar el item de navegación actual para migas de pan y título
    const currentItem = NAVIGATION_CONFIG.flatMap((g) => g.items).find((i) => i.href === pathname) ?? {
        id: 'panel-general',
        label: 'Panel General',
        href: '/',
    };

    const cambiarObra = (obraId: number): void => {
        router.post(
            contexto.update.url(),
            { obra_activa_id: obraId },
            { preserveScroll: true, preserveState: true },
        );
        setObraMenuOpen(false);
    };

    return (
        <div className="flex min-h-screen bg-[#e5e5e5] text-[#000000] font-sans antialiased">
            {/* ObraFlow Sidebar */}
            <DashboardSidebar
                groups={NAVIGATION_CONFIG}
                activeRoute={pathname}
                rolNombre={currentRol.nombre}
                rolCodigo={currentRol.id}
            />

            {/* Main Area */}
            <div className="flex-1 flex flex-col min-w-0">
                <div className="p-6 md:p-8 flex-1">
                    <HeaderBar
                        title={currentItem.label}
                        breadcrumb={['CONSORCIO PILLCO MARCA', 'VALLE DEL MANTARO', currentItem.label.toUpperCase()]}
                        userName={userName}
                        userInitials={userInitials}
                        actions={
                            <div className="flex items-center gap-2">
                                {/* Selector de Obra Activa */}
                                <div className="relative">
                                    <button
                                        onClick={() => setObraMenuOpen(!obraMenuOpen)}
                                        className="px-3 py-1.5 rounded-lg bg-white border border-[#c6c6c6] text-xs font-mono font-semibold text-black hover:bg-[#f3f3f3] flex items-center gap-1.5 shadow-sm"
                                    >
                                        <span className="w-2 h-2 rounded-full bg-[#d1ffca]" />
                                        <span>OBRA: {obraActiva?.nombre ?? 'Sin asignar'}</span>
                                        <span className="text-[10px]">▼</span>
                                    </button>
                                    {obraMenuOpen && (
                                        <>
                                            <button
                                                type="button"
                                                aria-label="Cerrar menú de obra"
                                                className="fixed inset-0 z-20 w-full h-full bg-transparent border-0 cursor-default p-0"
                                                onClick={() => setObraMenuOpen(false)}
                                            />
                                            <div className="absolute right-0 mt-1 w-64 rounded-xl bg-white border border-[#c6c6c6] shadow-lg p-1.5 z-30 space-y-1">
                                                <div className="px-2 py-1 text-[10px] font-mono text-[#888888] uppercase">
                                                    Seleccionar Frente / Obra
                                                </div>
                                                {obras.map((o) => (
                                                    <button
                                                        key={o.id}
                                                        onClick={() => cambiarObra(o.id)}
                                                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
                                                            o.id === obraActiva?.id
                                                                ? 'bg-[#d1ffca] text-black font-bold'
                                                                : 'hover:bg-[#f3f3f3] text-[#333333]'
                                                        }`}
                                                    >
                                                        <span className="w-1.5 h-1.5 rounded-full bg-black" />
                                                        <span className="truncate">{o.nombre}</span>
                                                    </button>
                                                ))}
                                                {obras.length === 0 && (
                                                    <div className="px-2.5 py-1.5 text-xs text-[#888888]">
                                                        No tiene obras asignadas.
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
                    <main>{children}</main>
                </div>
            </div>
        </div>
    );
}
