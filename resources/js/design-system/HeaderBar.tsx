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

    return valor.toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
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

function iconoNotificacion(item: NotificacionFeedItem): React.FC<IconoNotificacionProps> {
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
        <header className="mb-6 pb-4 border-b border-[#c6c6c6]/60">
            {/* Breadcrumb Monospaciado */}
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-[#666666] tracking-wider uppercase mb-1">
                {breadcrumb.map((crumb, idx) => (
                    <React.Fragment key={idx}>
                        <span>{crumb}</span>
                        {idx < breadcrumb.length - 1 && <span className="text-[#999999]">/</span>}
                    </React.Fragment>
                ))}
            </div>

            {/* Header Content */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                    {onMenuClick && (
                        <button
                            type="button"
                            onClick={onMenuClick}
                            aria-label="Abrir menú de navegación"
                            aria-expanded={false}
                            className="lg:hidden shrink-0 mt-1 p-2 rounded-lg bg-white border border-[#c6c6c6] text-[#444444] hover:bg-[#f3f3f3] transition-colors"
                        >
                            <IconMenu size={18} />
                        </button>
                    )}
                    <div className="min-w-0">
                        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#000000] tracking-tight uppercase leading-none break-words">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="mt-1.5 text-xs text-[#444444] font-normal">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>

                {/* Actions & Tools */}
                <div className="flex flex-wrap items-center gap-3">
                    {actions}

                    {/* Environment Pill */}
                    <div className="hidden sm:flex px-3 py-1 rounded-full bg-[#d1ffca] text-[#000000] text-[10px] font-mono font-bold items-center gap-1.5 border border-[#b2e5aa]">
                        <span className="w-1.5 h-1.5 rounded-full bg-black" />
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
                            className="relative p-2 rounded-lg bg-white border border-[#c6c6c6] text-[#444444] cursor-pointer hover:bg-[#f3f3f3] transition-colors flex items-center justify-center"
                        >
                            <IconBell size={16} />
                            {total > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#fff100] text-[#000000] font-mono text-[9px] font-bold flex items-center justify-center border border-black">
                                    {total > 99 ? '99+' : total}
                                </span>
                            )}
                        </button>

                        {panelAbierto && (
                            <>
                                <button
                                    type="button"
                                    aria-label="Cerrar notificaciones"
                                    className="fixed inset-0 z-20 w-full h-full bg-transparent border-0 cursor-default p-0"
                                    onClick={() => setPanelAbierto(false)}
                                />
                                <div
                                    id="panel-notificaciones"
                                    role="dialog"
                                    aria-label="Notificaciones y alertas"
                                    className="absolute right-0 mt-1 w-80 sm:w-96 max-w-[calc(100vw-2rem)] rounded-xl bg-white border border-[#c6c6c6] shadow-lg z-30 overflow-hidden"
                                >
                                    <div className="flex items-center justify-between px-3 py-2 border-b border-[#e2e2e2] bg-[#fafafa]">
                                        <span className="text-[10px] font-mono uppercase tracking-widest text-[#555555]">
                                            Notificaciones
                                        </span>
                                        <button
                                            type="button"
                                            onClick={marcarTodo}
                                            disabled={total === 0 || marcarTodas.processing}
                                            className="text-[10px] font-semibold text-[#000000] underline disabled:text-[#999999] disabled:no-underline"
                                        >
                                            Marcar todas como leídas
                                        </button>
                                    </div>

                                    <ul className="max-h-96 overflow-y-auto divide-y divide-[#eeeeee]">
                                        {feed.items.length === 0 && (
                                            <li className="px-3 py-8 text-center text-xs text-[#777777]">
                                                No tienes notificaciones ni alertas pendientes.
                                            </li>
                                        )}
                                        {feed.items.map((item) => {
                                            const destino = destinoNotificacion(item);
                                            const Icono = iconoNotificacion(item);
                                            const clase = `flex w-full text-left gap-2.5 px-3 py-2.5 transition-colors ${
                                                item.leida ? 'bg-white' : 'bg-[#f7fff5] hover:bg-[#eefbe9]'
                                            }`;
                                            const contenido = (
                                                <>
                                                    <span
                                                        className={`mt-0.5 shrink-0 ${
                                                            item.leida ? 'text-[#999999]' : 'text-[#2f9e44]'
                                                        }`}
                                                        aria-hidden="true"
                                                    >
                                                        <Icono size={14} />
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="flex items-start justify-between gap-2">
                                                            <span
                                                                className={`text-xs font-semibold ${
                                                                    item.leida ? 'text-[#666666]' : 'text-[#000000]'
                                                                }`}
                                                            >
                                                                {item.titulo}
                                                            </span>
                                                            {!item.leida && (
                                                                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#2f9e44] shrink-0" />
                                                            )}
                                                        </span>
                                                        {item.cuerpo && (
                                                            <span className="mt-0.5 block text-[11px] text-[#555555] leading-relaxed line-clamp-2">
                                                                {item.cuerpo}
                                                            </span>
                                                        )}
                                                        <span className="mt-1 flex items-center gap-2 text-[9px] font-mono uppercase text-[#888888]">
                                                            <span>{item.origen === 'alerta' ? 'Alerta' : 'Aviso'}</span>
                                                            {item.severidad && <span>· {item.severidad}</span>}
                                                            {item.fecha && <span>· {formatearFecha(item.fecha)}</span>}
                                                            {destino && <span className="ml-auto text-[#2f9e44]">Ver →</span>}
                                                        </span>
                                                    </span>
                                                </>
                                            );

                                            return (
                                                <li key={item.id}>
                                                    {destino ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => abrirItem(item, destino)}
                                                            className={`${clase} cursor-pointer`}
                                                        >
                                                            {contenido}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => marcarItem(item)}
                                                            disabled={item.leida}
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
                        className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white border border-[#c6c6c6] hover:bg-[#f3f3f3] transition-colors"
                    >
                        <div className="w-7 h-7 rounded-full bg-[#000000] text-[#ffffff] font-mono text-xs font-bold flex items-center justify-center">
                            {userInitials}
                        </div>
                        <span className="text-xs font-medium text-[#000000] hidden sm:inline">
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
                            className="p-2 rounded-lg bg-white border border-[#c6c6c6] text-[#444444] hover:bg-[#f3f3f3] hover:text-[#000000] transition-colors flex items-center justify-center"
                        >
                            <IconLogout size={16} />
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};
