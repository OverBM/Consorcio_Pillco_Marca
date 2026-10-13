import { NavGroup } from './design-system/DashboardSidebar';

export type AppRoleId =
    | 'gerente_general'
    | 'residente_obra'
    | 'jefe_logistica'
    | 'almacenero'
    | 'logistica_transporte'
    | 'proveedor'
    | 'administrador_sistema';

export interface AppRoleItem {
    id: AppRoleId;
    nombre: string;
    badge: string;
    descripcion: string;
}

export const APP_ROLES: AppRoleItem[] = [
    { id: 'residente_obra', nombre: 'Residente de Obra', badge: 'RO', descripcion: 'Gestión y control de frente de obra' },
    { id: 'jefe_logistica', nombre: 'Jefe de Logística / Compras', badge: 'LOG', descripcion: 'Aprobaciones y compras multi-almacén' },
    { id: 'almacenero', nombre: 'Almacenero de Obra', badge: 'ALM', descripcion: 'Recepción, despacho y kardex' },
    { id: 'gerente_general', nombre: 'Gerente General', badge: 'GG', descripcion: 'Visión consolidada y programa PMU' },
    { id: 'administrador_sistema', nombre: 'Administrador del Sistema', badge: 'ADM', descripcion: 'Accesos, roles y configuración' },
];

export const NAVIGATION_CONFIG: NavGroup[] = [
    {
        title: 'Panel Principal',
        items: [
            { id: 'panel-general', label: 'Panel General', href: '/panel', icon: 'dashboard' },
        ],
    },
    {
        title: 'Programa (PMU)',
        items: [
            { id: 'programa-tablero', label: 'Tablero Consolidado', href: '/programa', icon: 'building' },
            { id: 'programa-redistribucion', label: 'Redistribución Excedentes', href: '/programa/redistribucion', icon: 'refresh', badge: 'ACTIVO', tone: 'mint' },
        ],
    },
    {
        title: 'Gestión de Obra (PMI)',
        items: [
            { id: 'ciclo-vida', label: 'Ciclo de Vida de Obra', href: '/gestion-obra/ciclo-vida', icon: 'flag' },
            { id: 'alcance-partidas', label: 'Alcance y Partidas', href: '/gestion-obra/partidas', icon: 'file' },
            { id: 'cronograma-evm', label: 'Cronograma y EVM', href: '/gestion-obra/cronograma-evm', icon: 'trending-up' },
            { id: 'costos-valorizacion', label: 'Costos y Valorizaciones', href: '/gestion-obra/valorizaciones', icon: 'dollar' },
            { id: 'riesgos-alertas', label: 'Riesgos y Alertas', href: '/gestion-obra/riesgos', icon: 'alert', badge: 'SST/Stock', tone: 'yellow' },
            { id: 'control-cambios', label: 'Control de Cambios', href: '/gestion-obra/cambios', icon: 'edit' },
            { id: 'cierre-obra', label: 'Cierre y Liquidación', href: '/gestion-obra/cierre', icon: 'flag' },
        ],
    },
    {
        title: 'Almacén y Logística',
        items: [
            { id: 'matriz-stock', label: 'Matriz de Stock', href: '/stock', icon: 'box' },
            { id: 'recepcion-obra', label: 'Recepción de Obra', href: '/recepcion', icon: 'inbox' },
            { id: 'solicitudes-material', label: 'Solicitudes de Material', href: '/solicitudes', icon: 'clipboard' },
            { id: 'despacho-rutas', label: 'Despacho y Rutas', href: '/despachos', icon: 'truck' },
            { id: 'transferencias', label: 'Transferencias', href: '/transferencias', icon: 'repeat' },
            { id: 'inventario-fisico', label: 'Inventario Físico (Ciego)', href: '/inventario-fisico', icon: 'search' },
            { id: 'mermas', label: 'Control de Mermas', href: '/mermas', icon: 'trending-down' },
        ],
    },
    {
        title: 'Compras y Proveedores',
        items: [
            { id: 'requerimientos', label: 'Requerimientos de Compra', href: '/compras/requerimientos', icon: 'shopping-cart' },
            { id: 'cotizaciones', label: 'Cotizaciones Proveedor', href: '/compras/cotizaciones', icon: 'scale' },
            { id: 'ordenes-compra', label: 'Órdenes de Compra', href: '/compras/ordenes-compra', icon: 'file-check' },
            { id: 'proveedores', label: 'Directorio de Proveedores', href: '/compras/proveedores', icon: 'building' },
            { id: 'devoluciones', label: 'Devoluciones a Proveedor', href: '/compras/devoluciones', icon: 'repeat' },
        ],
    },
    {
        title: 'Personal y SST',
        items: [
            { id: 'asistencia-geocerca', label: 'Asistencia con Geocerca', href: '/personal/asistencia', icon: 'map-pin' },
            { id: 'planillas', label: 'Planillas de Pago', href: '/personal/planillas', icon: 'dollar' },
            { id: 'capacitaciones', label: 'Capacitación y Habilitación', href: '/personal/capacitaciones', icon: 'flag' },
            { id: 'incidentes-sst', label: 'Incidentes y Accidentes', href: '/sst/incidentes', icon: 'alert' },
            { id: 'epp-serializado', label: 'Uso y Control de EPP', href: '/sst/epp', icon: 'shield' },
        ],
    },
    {
        title: 'Calidad y Ambiente',
        items: [
            { id: 'observaciones-tecnicas', label: 'Observaciones Técnicas', href: '/calidad/observaciones', icon: 'search' },
            { id: 'monitoreo-ambiental', label: 'Monitoreo Ambiental', href: '/ambiente/monitoreo', icon: 'refresh' },
            { id: 'residuos-desmonte', label: 'Gestión de Residuos', href: '/ambiente/residuos', icon: 'repeat' },
        ],
    },
    {
        title: 'Administración',
        items: [
            { id: 'usuarios-roles', label: 'Usuarios y Accesos', href: '/admin/usuarios', icon: 'users' },
            { id: 'auditoria', label: 'Bitácora de Auditoría', href: '/admin/auditoria', icon: 'shield' },
            { id: 'parametros', label: 'Parámetros del Sistema', href: '/admin/parametros', icon: 'settings' },
        ],
    },
];
