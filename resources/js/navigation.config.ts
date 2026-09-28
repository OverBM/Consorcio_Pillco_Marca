// Configuración centralizada de navegación del sistema (Regla 4).
// Un solo grupo operativo: "Almacén y logística" con los 8 módulos derivados de Bizagi 16 al 30.
// Ningún nombre de proceso ni terminología técnica visible en UI.

import type { ComponentType, SVGProps } from 'react';
import {
    IconAlertTriangle,
    IconBoxes,
    IconClipboardList,
    IconFactory,
    IconHardHat,
    IconInbox,
    IconLayoutDashboard,
    IconRepeat,
    IconShoppingCart,
    IconTruck,
    IconUserCheck,
    IconWarehouse,
} from './components/icons';

export interface NavItemConfig {
    id: string;
    path: string;
    label: string;
    shortLabel?: string;
    description: string;
    icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;
    badgeKey?: string;
}

export interface NavGroupConfig {
    id: string;
    label: string;
    items: NavItemConfig[];
}

export const NAVIGATION_CONFIG: NavGroupConfig[] = [
    {
        id: 'almacen-logistica',
        label: 'Almacén y logística',
        items: [
            {
                id: 'panel',
                path: '/',
                label: 'Panel General',
                description: 'Supervisión del programa de obras e inventario geolocalizado',
                icon: IconLayoutDashboard,
            },
            {
                id: 'stock',
                path: '/stock',
                label: 'Matriz de Stock',
                description: 'Disponibilidad multi-almacén, ubicaciones y saldos',
                icon: IconBoxes,
            },
            {
                id: 'solicitudes',
                path: '/solicitudes',
                label: 'Solicitudes de Material',
                description: 'Pedidos de frente de obra y asignación GPS de almacén',
                icon: IconClipboardList,
            },
            {
                id: 'compras',
                path: '/compras',
                label: 'Requerimientos y Compras',
                description: 'Control presupuestal, cotizaciones multicriterio y órdenes de compra',
                icon: IconShoppingCart,
            },
            {
                id: 'recepcion',
                path: '/recepcion',
                label: 'Recepción de Obra',
                description: 'Verificación física contra OC, guías e ingreso al almacén',
                icon: IconInbox,
            },
            {
                id: 'despachos',
                path: '/despachos',
                label: 'Despacho y Rutas',
                description: 'Preparación, guías digitales y seguimiento de entregas en tránsito',
                icon: IconTruck,
            },
            {
                id: 'transferencias',
                path: '/transferencias',
                label: 'Transferencias',
                description: 'Movimientos entre almacenes y redistribución de excedentes',
                icon: IconRepeat,
            },
            {
                id: 'mermas',
                path: '/mermas',
                label: 'Mermas y Devoluciones',
                description: 'Control de pérdidas sobre umbral y devoluciones a proveedores',
                icon: IconAlertTriangle,
            },
        ],
    },
];

export const APP_ROLES = [
    { id: 'obrero_residente', nombre: 'Obrero / Residente de Obra', icon: IconHardHat, badge: 'Frente de Obra' },
    { id: 'jefe_logistica', nombre: 'Jefe de Logística y Compras', icon: IconUserCheck, badge: 'Logística Central' },
    { id: 'almacenero', nombre: 'Almacenero de Obra', icon: IconWarehouse, badge: 'Almacén' },
    { id: 'logistica_transporte', nombre: 'Logística / Transporte', icon: IconTruck, badge: 'Transporte' },
    { id: 'proveedor', nombre: 'Proveedor (Vista Registro)', icon: IconFactory, badge: 'Suministros' },
] as const;

export type AppRoleId = (typeof APP_ROLES)[number]['id'];
