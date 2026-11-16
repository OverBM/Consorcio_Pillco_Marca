<?php

namespace App\Support;

use Illuminate\Support\Str;

/**
 * Catálogo de módulos navegables para la búsqueda global.
 *
 * Permite que el command palette encuentre un módulo por su nombre exacto
 * ("mermas", "reportes", "cronograma") aunque no exista un registro de
 * negocio con ese texto. Los alias cubren sinónimos y errores de acentuación.
 */
final class CatalogoModulos
{
    /**
     * @return list<array{id: string, titulo: string, subtitulo: string, href: string, permiso: string|null, alias: list<string>}>
     */
    public static function todos(): array
    {
        return [
            ['id' => 'panel-general', 'titulo' => 'Panel General', 'subtitulo' => 'Inicio y consolidado operativo', 'href' => '/panel', 'permiso' => 'panel.ver', 'alias' => ['inicio', 'dashboard', 'tablero']],
            ['id' => 'reportes', 'titulo' => 'Reportes e Indicadores', 'subtitulo' => 'Indicadores, gráficos y filtros', 'href' => '/reportes', 'permiso' => 'panel.ver', 'alias' => ['reporte', 'indicadores', 'estadisticas', 'kpi', 'analisis']],
            ['id' => 'mi-perfil', 'titulo' => 'Mi Perfil', 'subtitulo' => 'Cuenta y seguridad', 'href' => '/perfil', 'permiso' => null, 'alias' => ['perfil', 'cuenta', 'clave', 'password']],
            ['id' => 'programa-tablero', 'titulo' => 'Tablero Consolidado PMU', 'subtitulo' => 'Programa de obras', 'href' => '/programa', 'permiso' => 'programa.ver', 'alias' => ['programa', 'pmu', 'obras', 'consolidado']],
            ['id' => 'programa-redistribucion', 'titulo' => 'Redistribución de Excedentes', 'subtitulo' => 'Sobrantes entre obras', 'href' => '/programa/redistribucion', 'permiso' => 'programa.ver', 'alias' => ['redistribucion', 'excedentes', 'sobrantes', 'ahp']],
            ['id' => 'ciclo-vida', 'titulo' => 'Ciclo de Vida de Obra', 'subtitulo' => 'Fases y requisitos PMI', 'href' => '/gestion-obra/ciclo-vida', 'permiso' => 'pmi.ver', 'alias' => ['ciclo', 'vida', 'fases', 'pmi']],
            ['id' => 'partidas', 'titulo' => 'Alcance y Partidas', 'subtitulo' => 'Presupuesto de obra', 'href' => '/gestion-obra/partidas', 'permiso' => 'pmi.ver', 'alias' => ['partidas', 'alcance', 'presupuesto']],
            ['id' => 'cronograma-evm', 'titulo' => 'Cronograma y EVM', 'subtitulo' => 'SPI, CPI, EAC y VAC', 'href' => '/gestion-obra/cronograma-evm', 'permiso' => 'pmi.ver', 'alias' => ['cronograma', 'evm', 'spi', 'cpi', 'avance']],
            ['id' => 'valorizaciones', 'titulo' => 'Costos y Valorizaciones', 'subtitulo' => 'Control de costos', 'href' => '/gestion-obra/valorizaciones', 'permiso' => 'pmi.ver', 'alias' => ['valorizacion', 'costos', 'costos']],
            ['id' => 'riesgos', 'titulo' => 'Riesgos y Alertas', 'subtitulo' => 'Matriz de riesgos', 'href' => '/gestion-obra/riesgos', 'permiso' => 'pmi.ver', 'alias' => ['riesgo', 'riesgos', 'alertas']],
            ['id' => 'cambios', 'titulo' => 'Control de Cambios', 'subtitulo' => 'Solicitudes de cambio', 'href' => '/gestion-obra/cambios', 'permiso' => 'pmi.ver', 'alias' => ['cambios', 'solicitud de cambio']],
            ['id' => 'cierre-obra', 'titulo' => 'Cierre y Liquidación', 'subtitulo' => 'Cierre de obra', 'href' => '/gestion-obra/cierre', 'permiso' => 'pmi.ver', 'alias' => ['cierre', 'liquidacion']],
            ['id' => 'mapa-operativo', 'titulo' => 'Mapa Operativo', 'subtitulo' => 'Geolocalización y rutas', 'href' => '/mapa-operativo', 'permiso' => 'mapa.ver', 'alias' => ['mapa', 'rutas', 'geo', 'geocerca']],
            ['id' => 'analitica', 'titulo' => 'Analítica Predictiva', 'subtitulo' => 'Pronósticos y alertas', 'href' => '/analitica', 'permiso' => 'analitica.ver', 'alias' => ['analitica', 'prediccion', 'pronostico', 'eoq']],
            ['id' => 'stock', 'titulo' => 'Matriz de Stock', 'subtitulo' => 'Inventario por almacén', 'href' => '/stock', 'permiso' => 'logistica.ver', 'alias' => ['stock', 'inventario', 'almacen', 'kardex']],
            ['id' => 'recepcion', 'titulo' => 'Recepción de Obra', 'subtitulo' => 'Ingreso de materiales', 'href' => '/recepcion', 'permiso' => 'logistica.ver', 'alias' => ['recepcion', 'ingreso']],
            ['id' => 'solicitudes', 'titulo' => 'Solicitudes de Material', 'subtitulo' => 'Pedidos de obra', 'href' => '/solicitudes', 'permiso' => 'logistica.ver', 'alias' => ['solicitud', 'solicitudes', 'pedido', 'material']],
            ['id' => 'despachos', 'titulo' => 'Despacho y Rutas', 'subtitulo' => 'Salidas y tracking', 'href' => '/despachos', 'permiso' => 'logistica.ver', 'alias' => ['despacho', 'despachos', 'ruta', 'tracking']],
            ['id' => 'transferencias', 'titulo' => 'Transferencias', 'subtitulo' => 'Movimientos entre almacenes', 'href' => '/transferencias', 'permiso' => 'logistica.ver', 'alias' => ['transferencia', 'transferencias']],
            ['id' => 'inventario-fisico', 'titulo' => 'Inventario Físico', 'subtitulo' => 'Conteo ciego', 'href' => '/inventario-fisico', 'permiso' => 'logistica.ver', 'alias' => ['inventario fisico', 'conteo', 'ciego']],
            ['id' => 'mermas', 'titulo' => 'Control de Mermas', 'subtitulo' => 'Pérdidas y ajustes', 'href' => '/mermas', 'permiso' => 'logistica.ver', 'alias' => ['merma', 'mermas', 'perdida', 'ajuste']],
            ['id' => 'requerimientos', 'titulo' => 'Requerimientos de Compra', 'subtitulo' => 'Necesidades de abastecimiento', 'href' => '/compras/requerimientos', 'permiso' => 'compras.ver', 'alias' => ['requerimiento', 'requerimientos', 'compra']],
            ['id' => 'cotizaciones', 'titulo' => 'Cotizaciones de Proveedor', 'subtitulo' => 'Comparativo de precios', 'href' => '/compras/cotizaciones', 'permiso' => 'compras.ver', 'alias' => ['cotizacion', 'cotizaciones', 'proveedor']],
            ['id' => 'ordenes-compra', 'titulo' => 'Órdenes de Compra', 'subtitulo' => 'OC emitidas', 'href' => '/compras/ordenes-compra', 'permiso' => 'compras.ver', 'alias' => ['orden de compra', 'ordenes', 'oc']],
            ['id' => 'proveedores', 'titulo' => 'Directorio de Proveedores', 'subtitulo' => 'Homologación', 'href' => '/compras/proveedores', 'permiso' => 'compras.ver', 'alias' => ['proveedor', 'proveedores', 'homologacion']],
            ['id' => 'devoluciones', 'titulo' => 'Devoluciones a Proveedor', 'subtitulo' => 'Rechazos y devoluciones', 'href' => '/compras/devoluciones', 'permiso' => 'compras.ver', 'alias' => ['devolucion', 'devoluciones']],
            ['id' => 'asistencia', 'titulo' => 'Asistencia con Geocerca', 'subtitulo' => 'Marcaciones de personal', 'href' => '/personal/asistencia', 'permiso' => 'personal.ver', 'alias' => ['asistencia', 'marcacion', 'geocerca']],
            ['id' => 'planillas', 'titulo' => 'Planillas de Pago', 'subtitulo' => 'Remuneraciones', 'href' => '/personal/planillas', 'permiso' => 'personal.ver', 'alias' => ['planilla', 'planillas', 'pago']],
            ['id' => 'capacitaciones', 'titulo' => 'Capacitación y Habilitación', 'subtitulo' => 'Personal capacitado', 'href' => '/personal/capacitaciones', 'permiso' => 'personal.ver', 'alias' => ['capacitacion', 'capacitaciones']],
            ['id' => 'incidentes-sst', 'titulo' => 'Incidentes y Accidentes', 'subtitulo' => 'Seguridad y salud', 'href' => '/sst/incidentes', 'permiso' => 'personal.ver', 'alias' => ['incidente', 'accidente', 'sst', 'seguridad']],
            ['id' => 'epp', 'titulo' => 'Uso y Control de EPP', 'subtitulo' => 'Equipos de protección', 'href' => '/sst/epp', 'permiso' => 'personal.ver', 'alias' => ['epp', 'proteccion']],
            ['id' => 'observaciones', 'titulo' => 'Observaciones Técnicas', 'subtitulo' => 'Calidad de obra', 'href' => '/calidad/observaciones', 'permiso' => 'calidad.ver', 'alias' => ['observacion', 'calidad']],
            ['id' => 'monitoreo-ambiental', 'titulo' => 'Monitoreo Ambiental', 'subtitulo' => 'Indicadores ambientales', 'href' => '/ambiente/monitoreo', 'permiso' => 'calidad.ver', 'alias' => ['ambiente', 'ambiental', 'monitoreo']],
            ['id' => 'residuos', 'titulo' => 'Gestión de Residuos', 'subtitulo' => 'Desmonte y reciclaje', 'href' => '/ambiente/residuos', 'permiso' => 'calidad.ver', 'alias' => ['residuo', 'residuos', 'desmonte']],
            ['id' => 'usuarios', 'titulo' => 'Usuarios y Accesos', 'subtitulo' => 'Roles y permisos', 'href' => '/admin/usuarios', 'permiso' => 'admin.ver', 'alias' => ['usuario', 'usuarios', 'roles', 'permisos']],
            ['id' => 'solicitudes-acceso', 'titulo' => 'Solicitudes de Acceso', 'subtitulo' => 'Altas de usuarios', 'href' => '/admin/solicitudes', 'permiso' => 'admin.ver', 'alias' => ['solicitud de acceso', 'acceso']],
            ['id' => 'auditoria', 'titulo' => 'Bitácora de Auditoría', 'subtitulo' => 'Registro de acciones', 'href' => '/admin/auditoria', 'permiso' => 'admin.ver', 'alias' => ['auditoria', 'bitacora', 'log']],
            ['id' => 'parametros', 'titulo' => 'Parámetros del Sistema', 'subtitulo' => 'Configuración', 'href' => '/admin/parametros', 'permiso' => 'admin.ver', 'alias' => ['parametros', 'configuracion', 'ajustes']],
            ['id' => 'fases', 'titulo' => 'Requisitos y Criterios por Fase', 'subtitulo' => 'Catálogo de fases', 'href' => '/admin/fases', 'permiso' => 'admin.ver', 'alias' => ['fases', 'requisitos', 'criterios']],
        ];
    }

    /**
     * @param  list<string>  $permisos
     * @return list<array{id: string, titulo: string, subtitulo: string, href: string}>
     */
    public static function buscar(string $termino, array $permisos, int $limite = 5): array
    {
        $normalizado = self::normalizar($termino);

        if ($normalizado === '') {
            return [];
        }

        $permitidos = array_flip($permisos);
        $coincidencias = [];

        foreach (self::todos() as $modulo) {
            if ($modulo['permiso'] !== null && ! isset($permitidos[$modulo['permiso']])) {
                continue;
            }

            $textos = array_merge(
                [self::normalizar($modulo['titulo']), self::normalizar($modulo['subtitulo'])],
                array_map(self::normalizar(...), $modulo['alias']),
            );

            $puntaje = 0;

            foreach ($textos as $texto) {
                if ($texto === $normalizado) {
                    $puntaje = max($puntaje, 100);
                } elseif (str_starts_with($texto, $normalizado)) {
                    $puntaje = max($puntaje, 70);
                } elseif (str_contains($texto, $normalizado)) {
                    $puntaje = max($puntaje, 40);
                }
            }

            if ($puntaje === 0) {
                continue;
            }

            $coincidencias[] = [
                'puntaje' => $puntaje,
                'item' => [
                    'id' => 'modulo-'.$modulo['id'],
                    'titulo' => $modulo['titulo'],
                    'subtitulo' => $modulo['subtitulo'],
                    'href' => $modulo['href'],
                ],
            ];
        }

        usort($coincidencias, fn (array $a, array $b): int => $b['puntaje'] <=> $a['puntaje']);

        return array_values(array_map(
            fn (array $coincidencia): array => $coincidencia['item'],
            array_slice($coincidencias, 0, $limite),
        ));
    }

    public static function normalizar(string $texto): string
    {
        return mb_strtolower(trim((string) preg_replace('/\s+/', ' ', Str::ascii($texto))));
    }
}
