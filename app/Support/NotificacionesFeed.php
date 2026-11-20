<?php

namespace App\Support;

use App\Models\Alerta;
use App\Models\AlertaLeida;
use App\Models\Notificacion;
use App\Models\Usuario;

/**
 * Construye el feed fusionado de notificaciones personales y alertas
 * operativas. Cada ítem se clasifica por módulo y por relevancia para el rol
 * del usuario, de modo que la campana puede mostrarlo con distinto tono,
 * icono y prioridad según quién lo consulta.
 */
final class NotificacionesFeed
{
    public const LIMITE = 20;

    private const CANDIDATAS = 100;

    /** Mapa tipo/referencia → módulo funcional. */
    private const MODULOS = [
        'stock' => 'logistica',
        'stock_almacen' => 'logistica',
        'stock_critico' => 'logistica',
        'stock_bajo_minimo' => 'logistica',
        'transferencia' => 'logistica',
        'transferencia_en_transito' => 'logistica',
        'despacho' => 'logistica',
        'merma' => 'logistica',
        'excedente' => 'programa',
        'excedente_detectado' => 'programa',
        'redistribucion' => 'programa',
        'requerimiento' => 'compras',
        'requerimiento_registrado' => 'compras',
        'cotizacion' => 'compras',
        'orden_compra' => 'compras',
        'proveedor' => 'compras',
        'obra' => 'pmi',
        'hito' => 'pmi',
        'riesgo' => 'pmi',
        'solicitud_acceso' => 'admin',
        'usuario' => 'admin',
        'incidente' => 'personal',
        'epp' => 'personal',
        'capacitacion' => 'personal',
        'observacion' => 'calidad',
        'residuo' => 'calidad',
        'medicion' => 'calidad',
    ];

    private const ETIQUETAS_MODULO = [
        'logistica' => 'Almacén y logística',
        'programa' => 'Programa de obras',
        'compras' => 'Compras',
        'pmi' => 'Gestión de obra',
        'personal' => 'Personal y SST',
        'calidad' => 'Calidad y ambiente',
        'admin' => 'Administración',
        'sistema' => 'Sistema',
    ];

    private const TITULOS_ALERTA = [
        'stock_bajo_minimo' => 'Stock bajo el mínimo',
        'stock_critico' => 'Stock crítico',
        'quiebre_proyectado' => 'Quiebre de stock proyectado',
        'bajo_punto_reorden' => 'Material bajo punto de reorden',
        'transferencia_en_transito' => 'Transferencia demorada',
        'transferencia_demorada' => 'Transferencia demorada',
        'despacho_retrasado' => 'Despacho retrasado',
        'merma_excesiva' => 'Merma fuera de rango',
        'requerimiento_urgente' => 'Requerimiento urgente',
        'excedente_detectado' => 'Excedente detectado',
        'hito_vencido' => 'Hito vencido',
        'riesgo_alto' => 'Riesgo alto identificado',
        'incidente_sst' => 'Incidente de seguridad',
        'solicitud_acceso' => 'Nueva solicitud de acceso',
        'alerta_operativa' => 'Alerta operativa',
    ];

    /**
     * @return array{items: list<array<string, mixed>>, sin_leer: int}
     */
    public static function paraUsuario(Usuario $usuario): array
    {
        $usuario->loadMissing(['roles.permisos']);

        $roles = $usuario->roles;
        $permisos = $roles
            ->flatMap(fn ($rol) => $rol->permisos)
            ->pluck('codigo')
            ->unique()
            ->values()
            ->all();

        $rolesCodigo = $roles->pluck('codigo')->all();
        $rolEtiqueta = (string) ($roles->first()?->nombre ?? 'Usuario');

        $leidas = AlertaLeida::query()
            ->where('usuario_id', $usuario->id)
            ->pluck('alerta_id')
            ->all();

        $notificaciones = Notificacion::query()
            ->where('usuario_id', $usuario->id)
            ->where('tipo', '!=', 'alerta_leida')
            ->latest()
            ->limit(self::CANDIDATAS)
            ->get()
            ->map(function (Notificacion $notificacion) use ($permisos, $rolesCodigo, $rolEtiqueta): array {
                $contexto = self::contexto($notificacion->tipo, $notificacion->referencia_tipo);

                return [
                    'id' => 'notificacion-'.$notificacion->id,
                    'origen' => 'notificacion',
                    'tipo' => $notificacion->tipo,
                    'titulo' => $notificacion->titulo,
                    'cuerpo' => $notificacion->cuerpo,
                    'severidad' => null,
                    'referencia_tipo' => $notificacion->referencia_tipo,
                    'referencia_id' => $notificacion->referencia_id,
                    'leida' => $notificacion->leida_en !== null,
                    'fecha' => $notificacion->created_at?->toIso8601String(),
                    ...self::presentacion($contexto, $permisos, $rolesCodigo, $rolEtiqueta),
                ];
            });

        $alertas = Alerta::query()
            ->where('estado', 'abierta')
            ->where('tipo', '!=', 'alerta_leida')
            ->latest()
            ->limit(self::CANDIDATAS)
            ->get()
            ->map(function (Alerta $alerta) use ($leidas, $permisos, $rolesCodigo, $rolEtiqueta): array {
                $contexto = self::contexto($alerta->tipo, $alerta->referencia_tipo);
                $presentacion = self::presentacion($contexto, $permisos, $rolesCodigo, $rolEtiqueta);

                return [
                    'id' => 'alerta-'.$alerta->id,
                    'origen' => 'alerta',
                    'tipo' => $alerta->tipo,
                    'titulo' => self::TITULOS_ALERTA[$alerta->tipo] ?? $presentacion['etiqueta'],
                    'cuerpo' => $alerta->mensaje,
                    'severidad' => $alerta->severidad,
                    'referencia_tipo' => $alerta->referencia_tipo,
                    'referencia_id' => $alerta->referencia_id,
                    'leida' => in_array($alerta->id, $leidas, true),
                    'fecha' => $alerta->created_at?->toIso8601String(),
                    ...$presentacion,
                    'tono' => self::tonoAlerta($alerta->severidad, $contexto['modulo']),
                ];
            });

        $items = $notificaciones
            ->concat($alertas)
            ->filter(fn (array $item) => $item['para_rol'])
            ->sortByDesc('fecha')
            ->take(self::LIMITE)
            ->values()
            ->all();

        return [
            'items' => $items,
            'sin_leer' => count(array_filter($items, fn (array $item) => ! $item['leida'])),
        ];
    }

    /**
     * @return array{modulo: string, etiqueta: string, icono: string}
     */
    private static function contexto(?string $tipo, ?string $referencia): array
    {
        $clave = (string) ($referencia ?? $tipo ?? '');
        $modulo = self::MODULOS[$clave] ?? null;

        if ($modulo === null) {
            foreach (self::MODULOS as $patron => $candidato) {
                if ($clave !== '' && str_contains($clave, $patron)) {
                    $modulo = $candidato;
                    break;
                }
            }
        }

        $modulo ??= 'sistema';

        return [
            'modulo' => $modulo,
            'etiqueta' => self::ETIQUETAS_MODULO[$modulo] ?? 'Sistema',
            'icono' => match ($modulo) {
                'logistica' => 'box',
                'programa' => 'refresh',
                'compras' => 'cart',
                'pmi' => 'building',
                'personal' => 'users',
                'calidad' => 'shield',
                'admin' => 'settings',
                default => 'bell',
            },
        ];
    }

    /**
     * @param  array{modulo: string, etiqueta: string, icono: string}  $contexto
     * @param  list<string>  $permisos
     * @param  list<string>  $rolesCodigo
     * @return array<string, mixed>
     */
    private static function presentacion(array $contexto, array $permisos, array $rolesCodigo, string $rolEtiqueta): array
    {
        $modulo = $contexto['modulo'];
        $relevante = $modulo === 'sistema'
            || in_array($modulo.'.ver', $permisos, true)
            || in_array($modulo.'.editar', $permisos, true);

        return [
            'modulo' => $modulo,
            'etiqueta' => $contexto['etiqueta'],
            'icono' => $contexto['icono'],
            'tono' => $relevante ? 'info' : 'neutral',
            'para_rol' => $relevante,
            'rol_etiqueta' => $rolEtiqueta,
            'roles_destino' => $rolesCodigo,
        ];
    }

    private static function tonoAlerta(?string $severidad, string $modulo): string
    {
        return match (mb_strtolower((string) $severidad)) {
            'critica', 'crítica', 'alta' => 'danger',
            'media', 'moderada' => 'warn',
            'baja' => $modulo === 'sistema' ? 'neutral' : 'info',
            default => 'info',
        };
    }
}
