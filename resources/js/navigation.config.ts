import { NavGroup, NavItem } from './design-system/DashboardSidebar';

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
 *
 * Cada línea del spec tiene el formato `id|nombre|badge|descripcion`.
 */
const ROLES_SPEC = `gerente_general|Gerente General|GG|Visión consolidada y programa PMU
planificacion_administracion|Planificación / Administración|PA|Planificación, administración y accesos
area_tecnica|Área Técnica / Ingeniería|AT|Ingeniería y gestión técnica de obra
area_financiera|Área Financiera|AF|Costos, valorizaciones y compras
residente_obra|Residente de Obra|RO|Gestión y control de frente de obra
maestro_obra|Maestro de Obra / Cuadrillas|MO|Ejecución y cuadrillas en campo
obrero_obra|Obrero / Personal de Obra|OB|Personal operativo de obra
almacenero_obra|Almacenero de Obra|ALM|Recepción, despacho y kardex
jefe_logistica_compras|Jefe de Logística / Compras|LOG|Aprobaciones y compras multi-almacén
jefe_recursos_humanos|Jefe de Recursos Humanos|RRHH|Personal, asistencia y planillas
prevencionista_ssoma|Prevencionista SSOMA|SST|Seguridad y salud ocupacional
supervisor_ambiental|Supervisor Ambiental|AMB|Monitoreo ambiental y residuos
oficina_tecnica|Oficina Técnica|OT|Control técnico y documentario
proveedor|Proveedor|PRV|Cotizaciones y órdenes de compra
banco_fideicomitente|Banco Fideicomitente|BAN|Supervisión financiera del fideicomiso
supervision_obra_entidad|Supervisión de Obra (Entidad)|SUP|Supervisión de la entidad contratante
administrador_sistema|Administrador del Sistema|ADM|Accesos, roles y configuración
auditor|Auditor|AUD|Lectura integral y bitácora`;

export const APP_ROLES: AppRoleItem[] = ROLES_SPEC.split('\n')
    .filter((linea) => linea.trim() !== '')
    .map((linea) => {
        const [id, nombre, badge, descripcion] = linea.split('|');

        return { id: id as AppRoleId, nombre, badge, descripcion };
    });

/**
 * Módulos accesibles por defecto cuando el usuario no tiene permisos resueltos.
 * El Panel General y Mi Perfil quedan siempre disponibles para usuarios autenticados.
 *
 * Cada sección inicia con `# Título` y cada módulo se declara como
 * `id|label|href|icon|permiso|badge|tone` (permiso, badge y tone son opcionales).
 */
const NAV_SPEC = `# Panel Principal
panel-general|Panel General|/panel|dashboard|panel.ver
mi-perfil|Mi Perfil|/perfil|shield
# Programa (PMU)
programa-tablero|Tablero Consolidado|/programa|building|programa.ver
programa-redistribucion|Redistribución Excedentes|/programa/redistribucion|refresh|programa.ver|ACTIVO|mint
# Gestión de Obra (PMI)
ciclo-vida|Ciclo de Vida de Obra|/gestion-obra/ciclo-vida|flag|pmi.ver
alcance-partidas|Alcance y Partidas|/gestion-obra/partidas|file|pmi.ver
cronograma-evm|Cronograma y EVM|/gestion-obra/cronograma-evm|trending-up|pmi.ver
costos-valorizacion|Costos y Valorizaciones|/gestion-obra/valorizaciones|dollar|pmi.ver
riesgos-alertas|Riesgos y Alertas|/gestion-obra/riesgos|alert|pmi.ver|SST/Stock|yellow
control-cambios|Control de Cambios|/gestion-obra/cambios|edit|pmi.ver
cierre-obra|Cierre y Liquidación|/gestion-obra/cierre|flag|pmi.ver
# Almacén y Logística
matriz-stock|Matriz de Stock|/stock|box|logistica.ver
recepcion-obra|Recepción de Obra|/recepcion|inbox|logistica.ver
solicitudes-material|Solicitudes de Material|/solicitudes|clipboard|logistica.ver
despacho-rutas|Despacho y Rutas|/despachos|truck|logistica.ver
transferencias|Transferencias|/transferencias|repeat|logistica.ver
inventario-fisico|Inventario Físico (Ciego)|/inventario-fisico|search|logistica.ver
mermas|Control de Mermas|/mermas|trending-down|logistica.ver
# Compras y Proveedores
requerimientos|Requerimientos de Compra|/compras/requerimientos|shopping-cart|compras.ver
cotizaciones|Cotizaciones Proveedor|/compras/cotizaciones|scale|compras.ver
ordenes-compra|Órdenes de Compra|/compras/ordenes-compra|file-check|compras.ver
proveedores|Directorio de Proveedores|/compras/proveedores|building|compras.ver
devoluciones|Devoluciones a Proveedor|/compras/devoluciones|repeat|compras.ver
# Personal y SST
asistencia-geocerca|Asistencia con Geocerca|/personal/asistencia|map-pin|personal.ver
planillas|Planillas de Pago|/personal/planillas|dollar|personal.ver
capacitaciones|Capacitación y Habilitación|/personal/capacitaciones|flag|personal.ver
incidentes-sst|Incidentes y Accidentes|/sst/incidentes|alert|personal.ver
epp-serializado|Uso y Control de EPP|/sst/epp|shield|personal.ver
# Calidad y Ambiente
observaciones-tecnicas|Observaciones Técnicas|/calidad/observaciones|search|calidad.ver
monitoreo-ambiental|Monitoreo Ambiental|/ambiente/monitoreo|refresh|calidad.ver
residuos-desmonte|Gestión de Residuos|/ambiente/residuos|repeat|calidad.ver
# Administración
usuarios-roles|Usuarios y Accesos|/admin/usuarios|users|admin.ver
solicitudes-acceso|Solicitudes de Acceso|/admin/solicitudes|clipboard|admin.ver|NUEVO|mint
auditoria|Bitácora de Auditoría|/admin/auditoria|shield|admin.ver
parametros|Parámetros del Sistema|/admin/parametros|settings|admin.ver
fases-catalogo|Requisitos y Criterios por Fase|/admin/fases|flag|admin.ver`;

const crearNavItem = (linea: string): NavItem => {
    const [id, label, href, icon, permiso, badge, tone] = linea.split('|');

    const item: NavItem = { id, label, href };

    if (icon) {
        item.icon = icon;
    }
    if (permiso) {
        item.permiso = permiso;
    }
    if (badge) {
        item.badge = badge;
    }
    if (tone) {
        item.tone = tone as NavItem['tone'];
    }

    return item;
};

const crearGruposNavegacion = (): NavGroup[] => {
    const grupos: NavGroup[] = [];

    for (const linea of NAV_SPEC.split('\n')) {
        if (linea.trim() === '') {
            continue;
        }

        if (linea.startsWith('#')) {
            grupos.push({ title: linea.replace(/^#\s*/, ''), items: [] });
            continue;
        }

        grupos[grupos.length - 1].items.push(crearNavItem(linea));
    }

    return grupos;
};

export const NAVIGATION_CONFIG: NavGroup[] = crearGruposNavegacion();

/**
 * Filtra la navegación dejando solo los módulos permitidos.
 *
 * El Panel General (mapa consolidado) y Mi Perfil son siempre visibles.
 */
export function filtrarNavegacion(permisos: string[]): NavGroup[] {
    const permitidos = new Set(permisos);

    return NAVIGATION_CONFIG.map((grupo) => ({
        ...grupo,
        items: grupo.items.filter(
            (item) => !item.permiso || permitidos.has(item.permiso),
        ),
    })).filter((grupo) => grupo.items.length > 0);
}
