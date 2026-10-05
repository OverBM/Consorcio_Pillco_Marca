import React, { useState, type ReactNode } from 'react';
import { usePage } from '@inertiajs/react';
import { DashboardSidebar } from '../../design-system/DashboardSidebar';
import { HeaderBar } from '../../design-system/HeaderBar';
import { NAVIGATION_CONFIG } from '../../navigation.config';
import { useAppStore } from '../../store/AppContext';
import { APP_ROLES, type AppRoleId } from '../../navigation.config';
import { IconRefresh } from '../icons/Icons';

export function AppLayout({ children }: { children: ReactNode }) {
    const { url } = usePage();
    const pathname = url.split('?')[0] ?? '/';
    const { rolActivo, setRolActivo, obraActiva, selectObra, obras, resetAllData } = useAppStore();
    const [rolMenuOpen, setRolMenuOpen] = useState(false);
    const [obraMenuOpen, setObraMenuOpen] = useState(false);

    const currentRol = APP_ROLES.find((r) => r.id === rolActivo) ?? APP_ROLES[1];

    // Buscar el item de navegación actual para migas de pan y título
    const currentItem = NAVIGATION_CONFIG.flatMap((g) => g.items).find((i) => i.href === pathname) ?? {
        id: 'panel-general',
        label: 'Panel General',
        href: '/',
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
                        userName={currentRol.nombre}
                        userInitials={currentRol.badge || 'RO'}
                        actions={
                            <div className="flex items-center gap-2">
                                {/* Selector de Rol Simulado */}
                                <div className="relative">
                                    <button
                                        onClick={() => {
                                            setRolMenuOpen(!rolMenuOpen);
                                            setObraMenuOpen(false);
                                        }}
                                        className="px-3 py-1.5 rounded-lg bg-white border border-[#c6c6c6] text-xs font-mono font-semibold text-black hover:bg-[#f3f3f3] flex items-center gap-1.5 shadow-sm"
                                    >
                                        <span>ROL: {currentRol.nombre}</span>
                                        <span className="text-[10px]">▼</span>
                                    </button>
                                    {rolMenuOpen && (
                                        <>
                                            <button
                                                type="button"
                                                aria-label="Cerrar menú de rol"
                                                className="fixed inset-0 z-20 w-full h-full bg-transparent border-0 cursor-default p-0"
                                                onClick={() => setRolMenuOpen(false)}
                                            />
                                            <div className="absolute right-0 mt-1 w-60 rounded-xl bg-white border border-[#c6c6c6] shadow-lg p-1.5 z-30 space-y-1">
                                                <div className="px-2 py-1 text-[10px] font-mono text-[#888888] uppercase">
                                                    Cambiar Rol de Demostración
                                                </div>
                                                {APP_ROLES.map((r) => (
                                                    <button
                                                        key={r.id}
                                                        onClick={() => {
                                                            setRolActivo(r.id as AppRoleId);
                                                            setRolMenuOpen(false);
                                                        }}
                                                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex justify-between items-center ${
                                                            r.id === rolActivo
                                                                ? 'bg-[#d1ffca] text-black font-bold'
                                                                : 'hover:bg-[#f3f3f3] text-[#333333]'
                                                        }`}
                                                    >
                                                        <span>{r.nombre}</span>
                                                        <span className="font-mono text-[9px] px-1 bg-[#e5e5e5] rounded">{r.badge}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Selector de Obra Activa */}
                                <div className="relative">
                                    <button
                                        onClick={() => {
                                            setObraMenuOpen(!obraMenuOpen);
                                            setRolMenuOpen(false);
                                        }}
                                        className="px-3 py-1.5 rounded-lg bg-white border border-[#c6c6c6] text-xs font-mono font-semibold text-black hover:bg-[#f3f3f3] flex items-center gap-1.5 shadow-sm"
                                    >
                                        <span className="w-2 h-2 rounded-full bg-[#d1ffca]" />
                                        <span>OBRA: {obraActiva.nombre}</span>
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
                                                        onClick={() => {
                                                            selectObra(o.id);
                                                            setObraMenuOpen(false);
                                                        }}
                                                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
                                                            o.id === obraActiva.id
                                                                ? 'bg-[#d1ffca] text-black font-bold'
                                                                : 'hover:bg-[#f3f3f3] text-[#333333]'
                                                        }`}
                                                    >
                                                        <span className="w-1.5 h-1.5 rounded-full bg-black" />
                                                        <span className="truncate">{o.nombre}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Botón de Restablecimiento */}
                                <button
                                    onClick={() => {
                                        if (window.confirm('¿Restablecer datos de demostración a valores iniciales?')) {
                                            resetAllData();
                                        }
                                    }}
                                    title="Restablecer datos"
                                    className="p-1.5 rounded-lg bg-white border border-[#c6c6c6] text-xs text-[#555555] hover:bg-[#f3f3f3] flex items-center justify-center"
                                >
                                    <IconRefresh size={14} />
                                </button>
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