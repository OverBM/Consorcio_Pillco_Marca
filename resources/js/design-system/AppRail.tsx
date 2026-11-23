import { useEffect, useState } from 'react';
import { Link } from '@inertiajs/react';

import { useThemeOpcional } from '../components/theme/ThemeProvider';
import { IconoPorNombre } from '../components/icons/PorNombre';
import { AccessibilityMenu } from './AccessibilityMenu';
import {
    IconClipboard,
    IconInbox,
    IconSearch,
    IconSettings,
    IconShoppingCart,
    IconTruck,
} from '../components/icons/Icons';

/**
 * Dock flotante de acciones rápidas, al estilo del dashboard de referencia.
 * Vive en la parte inferior central y no ocupa espacio del contenido.
 */
export interface AppRailProps {
    permisos?: string[];
    onSearch?: () => void;
    pathname?: string;
    /** Submódulos de Administración, que viven en la rueda de ajustes. */
    adminItems?: { id: string; label: string; href: string; icon?: string }[];
}

interface AccionRapida {
    label: string;
    href: string;
    permiso: string;
    Icono: typeof IconClipboard;
}

const ACCIONES_CREACION: AccionRapida[] = [
    {
        label: 'Solicitud de material',
        href: '/solicitudes',
        permiso: 'logistica.ver',
        Icono: IconClipboard,
    },
    {
        label: 'Recepción de obra',
        href: '/recepcion',
        permiso: 'logistica.ver',
        Icono: IconInbox,
    },
    {
        label: 'Despacho y rutas',
        href: '/despachos',
        permiso: 'logistica.ver',
        Icono: IconTruck,
    },
    {
        label: 'Requerimiento de compra',
        href: '/compras/requerimientos',
        permiso: 'compras.ver',
        Icono: IconShoppingCart,
    },
];

const claseBoton =
    'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white focus-ring disabled:cursor-not-allowed disabled:opacity-40 active:scale-95';

const claseMenu =
    'cpm-menu-drop absolute bottom-full left-1/2 z-50 mb-3 w-64 -translate-x-1/2 rounded-tile border border-line bg-surface p-1.5 text-ink shadow-pop';

export function AppRail({
    permisos = [],
    onSearch,
    pathname = '/',
    adminItems = [],
}: AppRailProps) {
    const [menuCrear, setMenuCrear] = useState(false);
    const [menuAjustes, setMenuAjustes] = useState(false);
    const tema = useThemeOpcional();
    const modoOscuro = tema?.tema === 'oscuro';

    const crear = ACCIONES_CREACION.filter((accion) =>
        permisos.includes(accion.permiso),
    );
    const ajustesHref = permisos.includes('admin.ver')
        ? '/admin/parametros'
        : '/perfil';
    const ajustesActivo =
        pathname.startsWith('/admin') || pathname === '/perfil';

    useEffect(() => {
        if (!menuCrear && !menuAjustes) {
            return;
        }

        const alPresionarTecla = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') {
                setMenuCrear(false);
                setMenuAjustes(false);
            }
        };

        window.addEventListener('keydown', alPresionarTecla);

        return () => window.removeEventListener('keydown', alPresionarTecla);
    }, [menuCrear, menuAjustes]);

    const alternarCrear = (): void => {
        setMenuCrear((abierto) => !abierto);
        setMenuAjustes(false);
    };

    const alternarAjustes = (): void => {
        setMenuAjustes((abierto) => !abierto);
        setMenuCrear(false);
    };

    return (
        <nav
            aria-label="Acciones rápidas"
            className="rounded-pill bg-ink shadow-pop fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-1/2 z-50 flex -translate-x-1/2 items-center gap-0.5 px-2 py-1.5 text-white"
        >
            <button
                type="button"
                onClick={onSearch}
                disabled={!onSearch}
                aria-label="Buscar"
                aria-disabled={!onSearch}
                title={
                    onSearch
                        ? 'Buscar (Ctrl/Cmd + K)'
                        : 'Búsqueda global en construcción'
                }
                className={claseBoton}
            >
                <IconSearch size={19} />
            </button>

            {crear.length > 0 && (
                <div className="relative">
                    <button
                        type="button"
                        onClick={alternarCrear}
                        aria-label="Crear"
                        aria-haspopup="true"
                        aria-expanded={menuCrear}
                        className={claseBoton}
                    >
                        <svg
                            width="19"
                            height="19"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            aria-hidden="true"
                        >
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                    </button>

                    {menuCrear && (
                        <>
                            <button
                                type="button"
                                aria-label="Cerrar menú de creación"
                                className="fixed inset-0 z-40 cursor-default bg-transparent"
                                onClick={() => setMenuCrear(false)}
                            />
                            <div className={claseMenu}>
                                <p className="text-muted text-micro px-2 py-1 font-mono tracking-wider uppercase">
                                    Crear registro
                                </p>
                                {crear.map(({ label, href, Icono }) => (
                                    <Link
                                        key={href}
                                        href={href}
                                        onClick={() => setMenuCrear(false)}
                                        className="text-ink hover:bg-soft text-label flex items-center gap-2 rounded-lg px-2 py-2 font-medium"
                                    >
                                        <Icono size={16} />
                                        <span>{label}</span>
                                    </Link>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            <button
                type="button"
                aria-label={
                    modoOscuro
                        ? 'Cambiar a modo claro'
                        : 'Cambiar a modo oscuro'
                }
                aria-pressed={modoOscuro}
                title={
                    modoOscuro
                        ? 'Cambiar a modo claro'
                        : 'Cambiar a modo oscuro'
                }
                className={claseBoton}
                onClick={tema?.alternarTema}
            >
                {modoOscuro ? (
                    <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <circle cx="12" cy="12" r="4" />
                        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                    </svg>
                ) : (
                    <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
                    </svg>
                )}
            </button>

            <AccessibilityMenu buttonClassName={claseBoton} />

            {adminItems.length > 0 ? (
                <div className="relative">
                    <button
                        type="button"
                        onClick={alternarAjustes}
                        aria-label="Administración"
                        aria-haspopup="true"
                        aria-expanded={menuAjustes}
                        title="Administración"
                        className={`${claseBoton} ${
                            ajustesActivo
                                ? 'text-ink hover:text-ink bg-white hover:bg-white'
                                : ''
                        }`}
                    >
                        <IconSettings size={19} />
                    </button>

                    {menuAjustes && (
                        <>
                            <button
                                type="button"
                                aria-label="Cerrar administración"
                                className="fixed inset-0 z-40 cursor-default bg-transparent"
                                onClick={() => setMenuAjustes(false)}
                            />
                            <div className={claseMenu}>
                                <p className="text-muted text-micro px-2 py-1 font-mono tracking-wider uppercase">
                                    Administración
                                </p>
                                {adminItems.map((item) => (
                                    <Link
                                        key={item.id}
                                        href={item.href}
                                        onClick={() => setMenuAjustes(false)}
                                        aria-current={
                                            item.href === pathname
                                                ? 'page'
                                                : undefined
                                        }
                                        className={`text-label flex items-center gap-2 rounded-lg px-2 py-2 font-medium ${
                                            item.href === pathname
                                                ? 'bg-soft text-ink'
                                                : 'text-ink hover:bg-soft'
                                        }`}
                                    >
                                        <IconoPorNombre
                                            nombre={item.icon}
                                            size={15}
                                        />
                                        <span>{item.label}</span>
                                    </Link>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            ) : (
                <Link
                    href={ajustesHref}
                    aria-label="Ajustes"
                    className={`${claseBoton} ${
                        ajustesActivo
                            ? 'text-ink hover:text-ink bg-white hover:bg-white'
                            : ''
                    }`}
                >
                    <IconSettings size={19} />
                </Link>
            )}
        </nav>
    );
}
