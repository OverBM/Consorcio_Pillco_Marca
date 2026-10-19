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
    onNotificationClick?: () => void;
    onMenuClick?: () => void;
    onLogout?: () => void;
    notificationCount?: number;
    userName?: string;
    userInitials?: string;
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
    actions,
}) => {
    const { props } = usePage();
    const feed = props.notificacionesFeed ?? { items: [], sin_leer: 0 };
    const total = notificationCount ?? feed.sin_leer;

    const [panelAbierto, setPanelAbierto] = useState(false);

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
        <header className="mb-6 border-b border-[#c6c6c6]/60 pb-4">
            {/* Breadcrumb Monospaciado */}
            <div className="mb-1 flex flex-wrap items-center gap-1.5 font-mono text-[10px] tracking-wider text-[#666666] uppercase">
                {breadcrumb.map((crumb, idx) => (
                    <React.Fragment key={idx}>
                        <span>{crumb}</span>
                        {idx < breadcrumb.length - 1 && (
                            <span className="text-[#999999]">/</span>
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Header Content */}
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div className="flex min-w-0 items-start gap-3">
                    {onMenuClick && (
                        <button
                            type="button"
                            onClick={onMenuClick}
                            aria-label="Abrir menú de navegación"
                            aria-expanded={false}
                            className="mt-1 shrink-0 rounded-lg border border-[#c6c6c6] bg-white p-2 text-[#444444] transition-colors hover:bg-[#f3f3f3] lg:hidden"
                        >
                            <IconMenu size={18} />
                        </button>
                    )}
                    <div className="min-w-0">
                        <h1 className="font-display text-3xl leading-none font-extrabold tracking-tight break-words text-[#000000] uppercase sm:text-4xl md:text-5xl">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="mt-1.5 text-xs font-normal text-[#444444]">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>

                {/* Actions & Tools */}
                <div className="flex flex-wrap items-center gap-3">
                    {actions}

                    {/* Environment Pill */}
                    <div className="hidden items-center gap-1.5 rounded-full border border-[#b2e5aa] bg-[#d1ffca] px-3 py-1 font-mono text-[10px] font-bold text-[#000000] sm:flex">
                        <span className="h-1.5 w-1.5 rounded-full bg-black" />
                        HUANCAYO · EN LÍNEA
                    </div>

                    {/* Notification Panel */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={alternarPanel}
                            aria-label={`Notificaciones${total > 0 ? `: ${total} sin leer` : ''}`}
                            aria-haspopup="true"
                            aria-expanded={panelAbierto}
                            aria-controls="panel-notificaciones"
                            className="relative flex cursor-pointer items-center justify-center rounded-lg border border-[#c6c6c6] bg-white p-2 text-[#444444] transition-colors hover:bg-[#f3f3f3]"
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
                                    className="fixed inset-0 z-20 h-full w-full cursor-default border-0 bg-transparent p-0"
                                    onClick={() => setPanelAbierto(false)}
                                />
                                <div
                                    id="panel-notificaciones"
                                    role="dialog"
                                    aria-label="Notificaciones y alertas"
                                    className="absolute right-0 z-30 mt-1 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-[#c6c6c6] bg-white shadow-lg sm:w-96"
                                >
                                    <div className="flex items-center justify-between border-b border-[#e2e2e2] bg-[#fafafa] px-3 py-2">
                                        <span className="font-mono text-[10px] tracking-widest text-[#555555] uppercase">
                                            Notificaciones
                                        </span>
                                        <button
                                            type="button"
                                            onClick={marcarTodo}
                                            disabled={
                                                total === 0 ||
                                                marcarTodas.processing
                                            }
                                            className="text-[10px] font-semibold text-[#000000] underline disabled:text-[#999999] disabled:no-underline"
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
                    <Link
                        href="/perfil"
                        title="Ver mi perfil"
                        aria-label="Ver mi perfil"
                        className="flex items-center gap-2 rounded-lg border border-[#c6c6c6] bg-white px-3 py-1 transition-colors hover:bg-[#f3f3f3]"
                    >
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#000000] font-mono text-xs font-bold text-[#ffffff]">
                            {userInitials}
                        </div>
                        <span className="hidden text-xs font-medium text-[#000000] sm:inline">
                            {userName}
                        </span>
                    </Link>

                    {/* Logout */}
                    {onLogout && (
                        <button
                            type="button"
                            onClick={onLogout}
                            aria-label="Cerrar sesión"
                            title="Cerrar sesión"
                            className="flex items-center justify-center rounded-lg border border-[#c6c6c6] bg-white p-2 text-[#444444] transition-colors hover:bg-[#f3f3f3] hover:text-[#000000]"
                        >
                            <IconLogout size={16} />
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};
