import React from 'react';

import {
    IconAlertTriangle,
    IconBox,
    IconBuilding,
    IconClipboard,
    IconDashboard,
    IconDollar,
    IconEdit,
    IconFileCheck,
    IconFileText,
    IconFlag,
    IconInbox,
    IconMapPin,
    IconRefresh,
    IconRepeat,
    IconScale,
    IconSearch,
    IconSettings,
    IconShield,
    IconShoppingCart,
    IconTrendingDown,
    IconTrendingUp,
    IconTruck,
    IconUsers,
} from './Icons';

type IconoComponente = React.FC<{ size?: number; className?: string }>;

/**
 * Traduce el `icon` declarado en `navigation.config.ts` a un componente SVG.
 * Así la navegación se define con texto y el shell decide el dibujo.
 */
const ICONOS: Record<string, IconoComponente> = {
    dashboard: IconDashboard,
    shield: IconShield,
    building: IconBuilding,
    refresh: IconRefresh,
    flag: IconFlag,
    file: IconFileText,
    'trending-up': IconTrendingUp,
    'trending-down': IconTrendingDown,
    dollar: IconDollar,
    alert: IconAlertTriangle,
    edit: IconEdit,
    box: IconBox,
    inbox: IconInbox,
    clipboard: IconClipboard,
    truck: IconTruck,
    repeat: IconRepeat,
    search: IconSearch,
    'shopping-cart': IconShoppingCart,
    scale: IconScale,
    'file-check': IconFileCheck,
    users: IconUsers,
    'map-pin': IconMapPin,
    settings: IconSettings,
};

export function IconoPorNombre({
    nombre,
    size = 16,
    className,
}: {
    nombre?: string;
    size?: number;
    className?: string;
}) {
    if (!nombre) {
        return null;
    }

    const Icono = ICONOS[nombre] ?? IconDashboard;

    return <Icono size={size} className={className} />;
}
