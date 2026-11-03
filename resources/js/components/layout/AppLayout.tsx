import { useEffect, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { AppRail } from '../../design-system/AppRail';
import { GlobalSearch } from '../../design-system/GlobalSearch';
import { HeaderBar } from '../../design-system/HeaderBar';
import { ModulePills, SubmodulePills } from '../../design-system/TopPills';
import { IconBrandMark } from '../icons/Icons';
import {
    APP_ROLES,
    NAVIGATION_CONFIG,
    filtrarNavegacion,
} from '../../navigation.config';
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

export function AppLayout({ children }: { children: React.ReactNode }) {
    const { url, props } = usePage();
    const pathname = url.split('?')[0] ?? '/';
    const [obraMenuOpen, setObraMenuOpen] = useState(false);
    const [busquedaAbierta, setBusquedaAbierta] = useState(false);

    const usuario = props.auth.user;
    const obras = props.catalogos.obras;
    const obraActiva =
        obras.find(
            (o) => String(o.id) === String(props.contexto.obra_activa_id ?? ''),
        ) ?? null;

    const rolCodigo = usuario?.roles[0]?.codigo ?? '';
    const currentRol: { id: string; nombre: string; badge: string } =
        APP_ROLES.find((r) => r.id === rolCodigo) ?? {
            id: rolCodigo || 'residente_obra',
            nombre: usuario?.roles[0]?.nombre ?? 'Usuario',
            badge: usuario ? iniciales(usuario.name) : 'U',
        };

    const permisos = usuario?.permisos ?? [];
    const navegacion = filtrarNavegacion(permisos);
    const adminItems =
        navegacion.find((grupo) => grupo.title === 'Administración')?.items ??
        [];

    const userName = usuario?.name ?? 'Usuario';
    const userInitials = iniciales(userName);

    const etiquetasRuta: Record<string, string> = {
        '/compras': 'Compras y Abastecimiento',
        '/finanzas/presupuesto': 'Control Presupuestal',
        '/finanzas/adelantos': 'Adelantos y Fideicomiso',
    };

    const currentItem = NAVIGATION_CONFIG.flatMap((g) => g.items).find(
        (i) => i.href === pathname,
    ) ?? {
        id: 'ruta-actual',
        label: etiquetasRuta[pathname] ?? 'Panel General',
        href: pathname,
    };

    const cambiarObra = (obraId: number | null): void => {
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

    useEffect(() => {
        const atajo = (evento: KeyboardEvent): void => {
            if ((evento.ctrlKey || evento.metaKey) && evento.key === 'k') {
                evento.preventDefault();
                setBusquedaAbierta(true);
            }
        };

        window.addEventListener('keydown', atajo);

        return () => window.removeEventListener('keydown', atajo);
    }, []);

    return (
        <div className="bg-canvas text-ink min-h-screen font-sans antialiased">
            <AppRail
                permisos={permisos}
                pathname={pathname}
                adminItems={adminItems}
                onSearch={() => setBusquedaAbierta(true)}
            />

            <GlobalSearch
                abierto={busquedaAbierta}
                onCerrar={() => setBusquedaAbierta(false)}
            />

            <header className="border-line bg-canvas/85 sticky top-0 z-[2500] border-b backdrop-blur">
                <div className="mx-auto w-full max-w-[var(--app-max)] px-[var(--gutter)]">
                    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-2.5">
                        <Link
                            href="/panel"
                            aria-label="Ir al panel general"
                            className="border-line bg-surface shadow-card rounded-pill flex items-center gap-2 border px-2.5 py-1.5"
                        >
                            <span className="bg-ink text-ink grid h-9 w-9 place-items-center rounded-full text-white">
                                <IconBrandMark size={20} />
                            </span>
                            <span className="hidden leading-tight sm:block">
                                <span className="font-display text-ink block text-xs font-bold uppercase">
                                    Consorcio Pillco Marca
                                </span>
                                <span className="text-muted block text-[10px]">
                                    Valle del Mantaro
                                </span>
                            </span>
                        </Link>

                        <div className="flex min-w-0 justify-center">
                            <ModulePills
                                grupos={navegacion}
                                pathname={pathname}
                            />
                        </div>

                        <HeaderBar
                            compacto
                            title={currentItem.label}
                            mostrarTitulo={false}
                            subtitle={currentRol.nombre}
                            breadcrumb={[]}
                            userName={userName}
                            userInitials={userInitials}
                            rolNombre={currentRol.nombre}
                            onLogout={cerrarSesion}
                            actions={
                                <>
                                    <div className="relative hidden lg:block">
                                        <button
                                            onClick={() =>
                                                setObraMenuOpen(!obraMenuOpen)
                                            }
                                            className="rounded-pill border-line bg-surface text-ink hover:bg-soft flex max-w-[45vw] items-center gap-1.5 border px-3 py-2 font-mono text-[11px] font-semibold lg:max-w-none"
                                        >
                                            <span className="bg-exito h-2 w-2 shrink-0 rounded-full" />
                                            <span className="truncate">
                                                {obraActiva?.nombre ??
                                                    'Todas las obras'}
                                            </span>
                                            <span className="text-[10px]">
                                                ▼
                                            </span>
                                        </button>
                                        {obraMenuOpen && (
                                            <>
                                                <button
                                                    type="button"
                                                    aria-label="Cerrar menú de obra"
                                                    className="fixed inset-0 z-40 h-full w-full cursor-default border-0 bg-transparent p-0"
                                                    onClick={() =>
                                                        setObraMenuOpen(false)
                                                    }
                                                />
                                                <div className="rounded-tile border-line bg-surface shadow-pop absolute right-0 z-50 mt-1 w-64 space-y-1 border p-1.5">
                                                    <div className="text-muted text-micro px-2 py-1 font-mono uppercase">
                                                        Seleccionar Frente /
                                                        Obra
                                                    </div>
                                                    <button
                                                        onClick={() =>
                                                            cambiarObra(null)
                                                        }
                                                        className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium ${
                                                            obraActiva === null
                                                                ? 'bg-brand-100 text-brand-900 font-bold'
                                                                : 'text-ink hover:bg-soft'
                                                        }`}
                                                    >
                                                        <span className="bg-brand-500 h-1.5 w-1.5 rounded-full" />
                                                        <span className="truncate">
                                                            Todas las obras
                                                        </span>
                                                    </button>
                                                    {obras.map((o) => (
                                                        <button
                                                            key={o.id}
                                                            onClick={() =>
                                                                cambiarObra(
                                                                    o.id,
                                                                )
                                                            }
                                                            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium ${
                                                                o.id ===
                                                                obraActiva?.id
                                                                    ? 'bg-brand-100 text-brand-900 font-bold'
                                                                    : 'text-ink hover:bg-soft'
                                                            }`}
                                                        >
                                                            <span className="bg-ink h-1.5 w-1.5 rounded-full" />
                                                            <span className="truncate">
                                                                {o.nombre}
                                                            </span>
                                                        </button>
                                                    ))}
                                                    {obras.length === 0 && (
                                                        <div className="text-muted px-2.5 py-1.5 text-xs">
                                                            No tiene obras
                                                            asignadas.
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </>
                            }
                        />
                    </div>

                    <div className="pb-2">
                        <SubmodulePills
                            grupos={navegacion}
                            pathname={pathname}
                        />
                    </div>
                </div>
            </header>

            <div>
                <main className="mx-auto w-full max-w-[var(--app-max)] px-[var(--gutter)] py-5 pb-28 lg:pb-8">
                    <nav
                        aria-label="Ruta de navegación"
                        className="text-muted mb-1 flex flex-wrap items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase"
                    >
                        <span>Consorcio Pillco Marca</span>
                        <span className="text-muted/60">/</span>
                        <span>Valle del Mantaro</span>
                        <span className="text-muted/60">/</span>
                        <span className="text-ink">{currentItem.label}</span>
                    </nav>
                    {children}
                </main>
            </div>
        </div>
    );
}
