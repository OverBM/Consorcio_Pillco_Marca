import React, { useEffect, useState } from 'react';
import { Link, router, useHttp, usePage } from '@inertiajs/react';
import { refrescarProps } from '../utils/refrescar';
import {
    IconAlertTriangle,
    IconBell,
    IconBox,
    IconBuilding,
    IconLogout,
    IconMenu,
    IconRefresh,
    IconRepeat,
    IconShoppingCart,
    IconUsers,
} from '@/components/icons/Icons';
import type { NotificacionFeedItem } from '@/types/auth';

interface HeaderBarProps {
    title: string;
    breadcrumb?: string[];
    subtitle?: string;
    /** Oculta el título grande cuando la página ya muestra su propio encabezado. */
    mostrarTitulo?: boolean;
    /** Solo acciones: se usa dentro de la barra superior. */
    compacto?: boolean;
    onNotificationClick?: () => void;
    onMenuClick?: () => void;
    onLogout?: () => void;
    notificationCount?: number;
    userName?: string;
    userInitials?: string;
    rolNombre?: string;
    actions?: React.ReactNode;
}

function formatearFecha(fecha: string | null): string {
    if (!fecha) {
        return '';
    }

    const valor = new Date(fecha);

    if (Number.isNaN(valor.getTime())) {
        return '';
    }

    return valor.toLocaleString('es-PE', {
        dateStyle: 'short',
        timeStyle: 'short',
    });
}

const DESTINOS_NOTIFICACION: Record<string, string> = {
    obra: '/programa',
    excedente: '/programa/redistribucion',
    requerimiento: '/compras/requerimientos',
    transferencia: '/transferencias',
    material: '/stock',
    stock_almacen: '/stock',
    solicitud_acceso: '/admin/solicitudes',
};

function destinoNotificacion(item: NotificacionFeedItem): string | null {
    if (item.referencia_tipo && DESTINOS_NOTIFICACION[item.referencia_tipo]) {
        return DESTINOS_NOTIFICACION[item.referencia_tipo];
    }

    if (item.tipo === 'excedente_detectado') {
        return '/programa/redistribucion';
    }

    return null;
}

type IconoNotificacionProps = { size?: number; className?: string };

function iconoNotificacion(
    item: NotificacionFeedItem,
): React.FC<IconoNotificacionProps> {
    switch (item.referencia_tipo) {
        case 'excedente':
            return IconRefresh;
        case 'requerimiento':
            return IconShoppingCart;
        case 'transferencia':
            return IconRepeat;
        case 'material':
        case 'stock_almacen':
            return IconBox;
        case 'solicitud_acceso':
            return IconUsers;
        case 'obra':
            return IconBuilding;
        default:
            return item.origen === 'alerta' ? IconAlertTriangle : IconBell;
    }
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
    title,
    breadcrumb = ['PANEL', 'OPERACIONES', 'VALLE DEL MANTARO'],
    subtitle,
    onNotificationClick,
    onMenuClick,
    onLogout,
    notificationCount,
    userName = 'Residente de Obra',
    userInitials = 'RO',
    rolNombre,
    actions,
    mostrarTitulo = true,
    compacto = false,
}) => {
    const { props } = usePage();
    const feed = props.notificacionesFeed ?? { items: [], sin_leer: 0 };
    const total = notificationCount ?? feed.sin_leer;

    const [panelAbierto, setPanelAbierto] = useState(false);
    const [menuPerfil, setMenuPerfil] = useState(false);

    const marcarTodas = useHttp({});
    const marcarUna = useHttp({});

    useEffect(() => {
        if (!panelAbierto) {
            return;
        }

        const alPresionarTecla = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') {
                setPanelAbierto(false);
            }
        };

        window.addEventListener('keydown', alPresionarTecla);

        return () => window.removeEventListener('keydown', alPresionarTecla);
    }, [panelAbierto]);

    const alternarPanel = (): void => {
        setPanelAbierto((anterior) => !anterior);
        onNotificationClick?.();
    };

    const urlMarcarLeida = (item: NotificacionFeedItem): string =>
        item.origen === 'alerta'
            ? `/api/v1/alertas/${item.id.replace('alerta-', '')}/marcar-leida`
            : `/api/v1/notificaciones/${item.id.replace('notificacion-', '')}/marcar-leida`;

    const marcarItem = (item: NotificacionFeedItem): void => {
        if (item.leida) {
            return;
        }

        void marcarUna.post(urlMarcarLeida(item), {
            onSuccess: () => refrescarProps('notificacionesFeed'),
        });
    };

    const abrirItem = (item: NotificacionFeedItem, destino: string): void => {
        if (item.leida) {
            router.visit(destino);
            return;
        }

        void marcarUna.post(urlMarcarLeida(item), {
            onSuccess: () => {
                refrescarProps('notificacionesFeed');
                router.visit(destino);
            },
            onError: () => router.visit(destino),
        });
    };

    const marcarTodo = (): void => {
        void marcarTodas.post('/api/v1/notificaciones/marcar-todas', {
            onSuccess: () => refrescarProps('notificacionesFeed'),
        });
    };

    return (
        <header
            className={
                compacto
                    ? 'relative z-[2500] flex items-center'
                    : 'relative z-[2500] mb-4'
            }
        >
            {/* Breadcrumb Monospaciado */}
            {!compacto && (
                <div className="text-muted mb-1 flex flex-wrap items-center gap-1.5 font-mono text-micro tracking-wider uppercase">
                    {breadcrumb.map((crumb, idx) => (
                        <React.Fragment key={idx}>
                            <span>{crumb}</span>
                            {idx < breadcrumb.length - 1 && (
                                <span className="text-muted/60">/</span>
                            )}
                        </React.Fragment>
                    ))}
                    {!mostrarTitulo && subtitle && (
                        <span className="text-ink/70">· {subtitle}</span>
                    )}
                </div>
            )}

            {/* Header Content */}
            <div
                className={
                    compacto
                        ? 'flex items-center gap-2'
                        : 'flex flex-col justify-between gap-4 md:flex-row md:items-center'
                }
            >
                <div className="flex min-w-0 items-start gap-3">
                    {onMenuClick && (
                        <button
                            type="button"
                            onClick={onMenuClick}
                            aria-label="Abrir menú de navegación"
                            aria-expanded={false}
                            className="border-line bg-surface text-muted hover:bg-soft mt-1 shrink-0 rounded-lg border p-2 transition-colors lg:hidden"
                        >
                            <IconMenu size={18} />
                        </button>
                    )}
                    {mostrarTitulo && (
                        <div className="min-w-0">
                            <h1 className="font-display text-ink text-3xl leading-none font-extrabold tracking-tight break-words uppercase sm:text-4xl">
                                {title}
                            </h1>
                            {subtitle && (
                                <p className="text-muted mt-1.5 text-xs font-normal">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions & Tools */}
                <div className="flex flex-wrap items-center gap-3">
                    {actions}

                    {/* Notification Panel */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={alternarPanel}
                            aria-label={`Notificaciones${total > 0 ? `: ${total} sin leer` : ''}`}
                            aria-haspopup="true"
                            aria-expanded={panelAbierto}
                            aria-controls="panel-notificaciones"
                            className="focus-ring relative flex cursor-pointer items-center justify-center rounded-pill border border-line bg-surface p-2 text-muted transition-colors hover:bg-soft"
                        >
                            <IconBell size={16} />
                            {total > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-black bg-[#fff100] px-1 font-mono text-[9px] font-bold text-[#000000]">
                                    {total > 99 ? '99+' : total}
                                </span>
                            )}
                        </button>

                        {panelAbierto && (
                            <>
                                <button
                                    type="button"
                                    aria-label="Cerrar notificaciones"
                                    className="fixed inset-0 z-40 h-full w-full cursor-default border-0 bg-transparent p-0"
                                    onClick={() => setPanelAbierto(false)}
                                />
                                <div
                                    id="panel-notificaciones"
                                    role="dialog"
                                    aria-label="Notificaciones y alertas"
                                    className="rounded-tile border-line bg-surface shadow-pop absolute right-0 z-50 mt-1 w-80 max-w-[calc(100vw-2rem)] overflow-hidden border sm:w-96"
                                >
                                    <div className="flex items-center justify-between border-b border-[#e2e2e2] bg-[#fafafa] px-3 py-2">
                                        <span className="font-mono text-micro tracking-widest text-[#555555] uppercase">
                                            Notificaciones
                                        </span>
                                        <button
                                            type="button"
                                            onClick={marcarTodo}
                                            disabled={
                                                total === 0 ||
                                                marcarTodas.processing
                                            }
                                            className="text-micro font-semibold text-[#000000] underline disabled:text-[#999999] disabled:no-underline"
                                        >
                                            Marcar todas como leídas
                                        </button>
                                    </div>

                                    <ul className="max-h-96 divide-y divide-[#eeeeee] overflow-y-auto">
                                        {feed.items.length === 0 && (
                                            <li className="px-3 py-8 text-center text-xs text-[#777777]">
                                                No tienes notificaciones ni
                                                alertas pendientes.
                                            </li>
                                        )}
                                        {feed.items.map((item) => {
                                            const destino =
                                                destinoNotificacion(item);
                                            const Icono =
                                                iconoNotificacion(item);
                                            const clase = `flex w-full text-left gap-2.5 px-3 py-2.5 transition-colors ${item.leida ? 'bg-white' : 'bg-[#f7fff5] hover:bg-[#eefbe9]'}`;
                                            const contenido = (
                                                <>
                                                    <span
                                                        className={`mt-0.5 shrink-0 ${item.leida ? 'text-[#999999]' : 'text-[#2f9e44]'}`}
                                                        aria-hidden="true"
                                                    >
                                                        <Icono size={14} />
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="flex items-start justify-between gap-2">
                                                            <span
                                                                className={`text-xs font-semibold ${item.leida ? 'text-[#666666]' : 'text-[#000000]'}`}
                                                            >
                                                                {item.titulo}
                                                            </span>
                                                            {!item.leida && (
                                                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2f9e44]" />
                                                            )}
                                                        </span>
                                                        {item.cuerpo && (
                                                            <span className="mt-0.5 line-clamp-2 block text-[11px] leading-relaxed text-[#555555]">
                                                                {item.cuerpo}
                                                            </span>
                                                        )}
                                                        <span className="mt-1 flex items-center gap-2 font-mono text-[9px] text-[#888888] uppercase">
                                                            <span>
                                                                {item.origen ===
                                                                'alerta'
                                                                    ? 'Alerta'
                                                                    : 'Aviso'}
                                                            </span>
                                                            {item.severidad && (
                                                                <span>
                                                                    ·{' '}
                                                                    {
                                                                        item.severidad
                                                                    }
                                                                </span>
                                                            )}
                                                            {item.fecha && (
                                                                <span>
                                                                    ·{' '}
                                                                    {formatearFecha(
                                                                        item.fecha,
                                                                    )}
                                                                </span>
                                                            )}
                                                            {destino && (
                                                                <span className="ml-auto text-[#2f9e44]">
                                                                    Ver →
                                                                </span>
                                                            )}
                                                        </span>
                                                    </span>
                                                </>
                                            );

                                            return (
                                                <li key={item.id}>
                                                    {destino ? (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                abrirItem(
                                                                    item,
                                                                    destino,
                                                                )
                                                            }
                                                            className={`${clase} cursor-pointer`}
                                                        >
                                                            {contenido}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                marcarItem(item)
                                                            }
                                                            disabled={
                                                                item.leida
                                                            }
                                                            className={clase}
                                                        >
                                                            {contenido}
                                                        </button>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            </>
                        )}
                    </div>

                    {/* User Profile Tag */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setMenuPerfil((v) => !v)}
                            aria-haspopup="true"
                            aria-expanded={menuPerfil}
                            aria-label={`Cuenta de ${userName}`}
                            className="border-line bg-surface hover:bg-soft rounded-pill flex items-center gap-2 border px-2.5 py-1.5 transition-colors"
                        >
                            <span className="bg-ink grid h-7 w-7 place-items-center rounded-full font-mono text-xs font-bold text-white">
                                {userInitials}
                            </span>
                            <span className="text-ink hidden text-xs font-medium sm:inline">
                                {userName}
                            </span>
                        </button>

                        {menuPerfil && (
                            <>
                                <button
                                    type="button"
                                    aria-label="Cerrar menú de cuenta"
                                    className="fixed inset-0 z-40 cursor-default bg-transparent"
                                    onClick={() => setMenuPerfil(false)}
                                />
                                <div className="rounded-tile border-line bg-surface shadow-pop absolute right-0 z-50 mt-1 w-56 border p-1.5">
                                    <div className="px-2 py-1.5">
                                        <p className="text-ink truncate text-xs font-semibold">
                                            {userName}
                                        </p>
                                        {rolNombre && (
                                            <p className="text-muted mt-0.5 text-micro">
                                                {rolNombre}
                                            </p>
                                        )}
                                    </div>
                                    <Link
                                        href="/perfil"
                                        onClick={() => setMenuPerfil(false)}
                                        className="text-ink hover:bg-soft block rounded-lg px-2 py-2 text-xs font-medium"
                                    >
                                        Ver mi perfil
                                    </Link>
                                    {onLogout && (
                                        <button
                                            type="button"
                                            onClick={onLogout}
                                            className="text-critico hover:bg-critico-soft block w-full rounded-lg px-2 py-2 text-left text-xs font-medium"
                                        >
                                            Cerrar sesión
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Logout */}
                    {onLogout && (
                        <button
                            type="button"
                            onClick={onLogout}
                            aria-label="Cerrar sesión"
                            title="Cerrar sesión"
                            className="focus-ring flex items-center justify-center rounded-pill border border-line bg-surface p-2 text-muted transition-colors hover:bg-soft hover:text-ink"
                        >
                            <IconLogout size={16} />
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};
