<?php

namespace App\Support;

/**
 * Catálogo canónico de estados y tipos del esquema consolidado.
 *
 * La web es la fuente de verdad para los estados visibles. Los valores
 * "legacy" se conservan mientras se normalizan datos históricos.
 */
final class EstadoCatalogo
{
    /**
     * @var array<string, list<string>>
     */
    public const COLUMNAS = [
        'programas.estado' => ['activa', 'ejecucion', 'cierre', 'liquidada', 'activo'],
        'obras.estado' => ['planificacion', 'ejecucion', 'cierre', 'liquidada', 'cerrada'],
        'obra_fases.estado' => ['pendiente', 'en_proceso', 'aprobada', 'rechazada'],
        'frentes_trabajo.estado' => ['activo', 'inactivo'],
        'solicitudes.tipo' => ['almacen', 'compra'],
        'solicitudes.estado' => ['registrada', 'atendida', 'anulada', 'borrador', 'solicitado', 'aprobado', 'rechazado', 'atendido', 'cerrado'],
        'transferencias.estado' => ['sugerida', 'solicitada', 'aprobada', 'en_transito', 'completada', 'anulada'],
        'alertas.estado' => ['abierta', 'reconocida', 'resuelta', 'vigente'],
        'alertas.severidad' => ['baja', 'media', 'alta', 'critica'],
        'excedentes_detectados.estado' => ['detectado', 'sugerido', 'redistribuido', 'descartado'],
        'ordenes_compra.estado' => ['emitida', 'confirmada_proveedor', 'en_transporte', 'recepcionada_total', 'recepcionada_parcial', 'anulada', 'recibida', 'parcial'],
        'cotizaciones.estado' => ['recibida', 'seleccionada', 'rechazada'],
        'mermas.estado' => ['registrada', 'aprobada', 'rechazada'],
        'riesgos.estado' => ['abierto', 'mitigado', 'cerrado', 'materializado'],
        'observaciones_tecnicas.estado' => ['notificada', 'levantada', 'cerrada'],
        'residuos.estado' => ['registrado', 'entregado', 'reaprovechado'],
        'residuos.clase' => ['no_peligroso', 'peligroso', 'reutilizable'],
        'residuos.destino' => ['eors', 'reaprovechamiento', 'reciclaje', 'relleno'],
        'inventarios_fisicos.estado' => ['programado', 'en_conteo', 'en_proceso', 'cerrado'],
        'capacitaciones.estado' => ['programada', 'completada', 'cancelada', 'ejecutada'],
        'planillas.estado' => ['abierta', 'procesada', 'pagada', 'cerrada'],
        'asistencias.estado' => ['consolidada', 'observada'],
        'solicitudes_acceso.estado' => ['pendiente', 'aprobada', 'rechazada'],
        'solicitudes_cambio.estado' => ['solicitada', 'aprobada', 'rechazada'],
        'lotes.estado' => ['cuarentena', 'disponible', 'vencido'],
        'epp_asignaciones.estado' => ['vigente', 'devuelto'],
        'ejecuciones_analitica.estado' => ['en_proceso', 'completada', 'fallida'],
        'incidentes.estado' => ['reportado', 'investigado', 'cerrado'],
        'parametros_inventario.estado' => ['calculado', 'sin_demanda', 'parametros_incompletos'],
        'parametros_sistema.tipo' => ['texto', 'numero', 'booleano'],
        'materiales.criticidad' => ['baja', 'normal', 'alta', 'critica'],
        'marcaciones.tipo' => ['entrada', 'salida'],
    ];

    /**
     * @return list<string>
     */
    public static function valores(string $tabla, string $columna): array
    {
        return self::COLUMNAS[$tabla.'.'.$columna] ?? [];
    }

    /**
     * @return array<string, list<string>>
     */
    public static function todas(): array
    {
        return self::COLUMNAS;
    }

    public static function comentario(string $tabla, string $columna): string
    {
        return 'Valores permitidos: '.implode(', ', self::valores($tabla, $columna));
    }
}
