import { NavGroup } from './design-system/DashboardSidebar';

export type AppRoleId =
    | 'gerente_general'
    | 'planificacion_administracion'
    | 'area_tecnica'
    | 'area_financiera'
    | 'residente_obra'
    | 'maestro_obra'
    | 'obrero_obra'
    | 'almacenero_obra'
    | 'jefe_logistica_compras'
    | 'jefe_recursos_humanos'
    | 'prevencionista_ssoma'
    | 'supervisor_ambiental'
    | 'oficina_tecnica'
    | 'proveedor'
    | 'banco_fideicomitente'
    | 'supervision_obra_entidad'
    | 'administrador_sistema'
    | 'auditor';

export interface AppRoleItem {
    id: AppRoleId;
    nombre: string;
    badge: string;
    descripcion: string;
}

/**
 * Catálogo alineado con los 18 códigos de `RolesSeeder`.
 */
export const APP_ROLES: AppRoleItem[] = [
    { id: 'gerente_general', nombre: 'Gerente General', badge: 'GG', descripcion: 'Visión consolidada y programa PMU' },
    { id: 'planificacion_administracion', nombre: 'Planificación / Administración', badge: 'PA', descripcion: 'Planificación, administración y accesos' },
    { id: 'area_tecnica', nombre: 'Área Técnica / Ingeniería', badge: 'AT', descripcion: 'Ingeniería y gestión técnica de obra' },
    { id: 'area_financiera', nombre: 'Área Financiera', badge: 'AF', descripcion: 'Costos, valorizaciones y compras' },
    { id: 'residente_obra', nombre: 'Residente de Obra', badge: 'RO', descripcion: 'Gestión y control de frente de obra' },
    { id: 'maestro_obra', nombre: 'Maestro de Obra / Cuadrillas', badge: 'MO', descripcion: 'Ejecución y cuadrillas en campo' },
    { id: 'obrero_obra', nombre: 'Obrero / Personal de Obra', badge: 'OB', descripcion: 'Personal operativo de obra' },
    { id: 'almacenero_obra', nombre: 'Almacenero de Obra', badge: 'ALM', descripcion: 'Recepción, despacho y kardex' },
    { id: 'jefe_logistica_compras', nombre: 'Jefe de Logística / Compras', badge: 'LOG', descripcion: 'Aprobaciones y compras multi-almacén' },
    { id: 'jefe_recursos_humanos', nombre: 'Jefe de Recursos Humanos', badge: 'RRHH', descripcion: 'Personal, asistencia y planillas' },
    { id: 'prevencionista_ssoma', nombre: 'Prevencionista SSOMA', badge: 'SST', descripcion: 'Seguridad y salud ocupacional' },
    { id: 'supervisor_ambiental', nombre: 'Supervisor Ambiental', badge: 'AMB', descripcion: 'Monitoreo ambiental y residuos' },
    { id: 'oficina_tecnica', nombre: 'Oficina Técnica', badge: 'OT', descripcion: 'Control técnico y documentario' },
    { id: 'proveedor', nombre: 'Proveedor', badge: 'PRV', descripcion: 'Cotizaciones y órdenes de compra' },
    { id: 'banco_fideicomitente', nombre: 'Banco Fideicomitente', badge: 'BAN', descripcion: 'Supervisión financiera del fideicomiso' },
    { id: 'supervision_obra_entidad', nombre: 'Supervisión de Obra (Entidad)', badge: 'SUP', descripcion: 'Supervisión de la entidad contratante' },
    { id: 'administrador_sistema', nombre: 'Administrador del Sistema', badge: 'ADM', descripcion: 'Accesos, roles y configuración' },
    { id: 'auditor', nombre: 'Auditor', badge: 'AUD', descripcion: 'Lectura integral y bitácora' },
];

/**
 * Módulos accesibles por defecto cuando el usuario no tiene permisos resueltos.
 * El Panel General y Mi Perfil quedan siempre disponibles para usuarios autenticados.
 */
export const NAVIGATION_CONFIG: NavGroup[] = [
    {
        title: 'Panel Principal',
        items: [
            { id: 'panel-general', label: 'Panel General', href: '/panel', icon: 'dashboard', permiso: 'panel.ver' },
            { id: 'mi-perfil', label: 'Mi Perfil', href: '/perfil', icon: 'shield' },
        ],
    },
    {
        title: 'Programa (PMU)',
        items: [
            { id: 'programa-tablero', label: 'Tablero Consolidado', href: '/programa', icon: 'building', permiso: 'programa.ver' },
            { id: 'programa-redistribucion', label: 'Redistribución Excedentes', href: '/programa/redistribucion', icon: 'refresh', badge: 'ACTIVO', tone: 'mint', permiso: 'programa.ver' },
        ],
    },
    {
        title: 'Gestión de Obra (PMI)',
        items: [
            { id: 'ciclo-vida', label: 'Ciclo de Vida de Obra', href: '/gestion-obra/ciclo-vida', icon: 'flag', permiso: 'pmi.ver' },
            { id: 'alcance-partidas', label: 'Alcance y Partidas', href: '/gestion-obra/partidas', icon: 'file', permiso: 'pmi.ver' },
            { id: 'cronograma-evm', label: 'Cronograma y EVM', href: '/gestion-obra/cronograma-evm', icon: 'trending-up', permiso: 'pmi.ver' },
            { id: 'costos-valorizacion', label: 'Costos y Valorizaciones', href: '/gestion-obra/valorizaciones', icon: 'dollar', permiso: 'pmi.ver' },
            { id: 'riesgos-alertas', label: 'Riesgos y Alertas', href: '/gestion-obra/riesgos', icon: 'alert', badge: 'SST/Stock', tone: 'yellow', permiso: 'pmi.ver' },
            { id: 'control-cambios', label: 'Control de Cambios', href: '/gestion-obra/cambios', icon: 'edit', permiso: 'pmi.ver' },
            { id: 'cierre-obra', label: 'Cierre y Liquidación', href: '/gestion-obra/cierre', icon: 'flag', permiso: 'pmi.ver' },
        ],
    },
    {
        title: 'Almacén y Logística',
        items: [
            { id: 'matriz-stock', label: 'Matriz de Stock', href: '/stock', icon: 'box', permiso: 'logistica.ver' },
            { id: 'recepcion-obra', label: 'Recepción de Obra', href: '/recepcion', icon: 'inbox', permiso: 'logistica.ver' },
            { id: 'solicitudes-material', label: 'Solicitudes de Material', href: '/solicitudes', icon: 'clipboard', permiso: 'logistica.ver' },
            { id: 'despacho-rutas', label: 'Despacho y Rutas', href: '/despachos', icon: 'truck', permiso: 'logistica.ver' },
            { id: 'transferencias', label: 'Transferencias', href: '/transferencias', icon: 'repeat', permiso: 'logistica.ver' },
            { id: 'inventario-fisico', label: 'Inventario Físico (Ciego)', href: '/inventario-fisico', icon: 'search', permiso: 'logistica.ver' },
            { id: 'mermas', label: 'Control de Mermas', href: '/mermas', icon: 'trending-down', permiso: 'logistica.ver' },
        ],
    },
    {
        title: 'Compras y Proveedores',
        items: [
            { id: 'requerimientos', label: 'Requerimientos de Compra', href: '/compras/requerimientos', icon: 'shopping-cart', permiso: 'compras.ver' },
            { id: 'cotizaciones', label: 'Cotizaciones Proveedor', href: '/compras/cotizaciones', icon: 'scale', permiso: 'compras.ver' },
            { id: 'ordenes-compra', label: 'Órdenes de Compra', href: '/compras/ordenes-compra', icon: 'file-check', permiso: 'compras.ver' },
            { id: 'proveedores', label: 'Directorio de Proveedores', href: '/compras/proveedores', icon: 'building', permiso: 'compras.ver' },
            { id: 'devoluciones', label: 'Devoluciones a Proveedor', href: '/compras/devoluciones', icon: 'repeat', permiso: 'compras.ver' },
        ],
    },
    {
        title: 'Personal y SST',
        items: [
            { id: 'asistencia-geocerca', label: 'Asistencia con Geocerca', href: '/personal/asistencia', icon: 'map-pin', permiso: 'personal.ver' },
            { id: 'planillas', label: 'Planillas de Pago', href: '/personal/planillas', icon: 'dollar', permiso: 'personal.ver' },
            { id: 'capacitaciones', label: 'Capacitación y Habilitación', href: '/personal/capacitaciones', icon: 'flag', permiso: 'personal.ver' },
            { id: 'incidentes-sst', label: 'Incidentes y Accidentes', href: '/sst/incidentes', icon: 'alert', permiso: 'personal.ver' },
            { id: 'epp-serializado', label: 'Uso y Control de EPP', href: '/sst/epp', icon: 'shield', permiso: 'personal.ver' },
        ],
    },
    {
        title: 'Calidad y Ambiente',
        items: [
            { id: 'observaciones-tecnicas', label: 'Observaciones Técnicas', href: '/calidad/observaciones', icon: 'search', permiso: 'calidad.ver' },
            { id: 'monitoreo-ambiental', label: 'Monitoreo Ambiental', href: '/ambiente/monitoreo', icon: 'refresh', permiso: 'calidad.ver' },
            { id: 'residuos-desmonte', label: 'Gestión de Residuos', href: '/ambiente/residuos', icon: 'repeat', permiso: 'calidad.ver' },
        ],
    },
    {
        title: 'Administración',
        items: [
            { id: 'usuarios-roles', label: 'Usuarios y Accesos', href: '/admin/usuarios', icon: 'users', permiso: 'admin.ver' },
            { id: 'solicitudes-acceso', label: 'Solicitudes de Acceso', href: '/admin/solicitudes', icon: 'clipboard', badge: 'NUEVO', tone: 'mint', permiso: 'admin.ver' },
            { id: 'auditoria', label: 'Bitácora de Auditoría', href: '/admin/auditoria', icon: 'shield', permiso: 'admin.ver' },
                { id: 'parametros', label: 'Parámetros del Sistema', href: '/admin/parametros', icon: 'settings', permiso: 'admin.ver' },
                { id: 'fases-catalogo', label: 'Requisitos y Criterios por Fase', href: '/admin/fases', icon: 'flag', permiso: 'admin.ver' },
        ],
    },
];

/**
 * Filtra la navegación dejando solo los módulos permitidos.
 *
 * El Panel General (mapa consolidado) y Mi Perfil son siempre visibles.
 */
export function filtrarNavegacion(permisos: string[]): NavGroup[] {
    const permitidos = new Set(permisos);

    return NAVIGATION_CONFIG.map((grupo) => ({
        ...grupo,
        items: grupo.items.filter((item) => !item.permiso || permitidos.has(item.permiso)),
    })).filter((grupo) => grupo.items.length > 0);
}
