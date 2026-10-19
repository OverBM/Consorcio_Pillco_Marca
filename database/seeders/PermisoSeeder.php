<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Catálogo de permisos por módulo y matriz rol × módulo.
 *
 * Módulos (8): panel, programa, pmi, logistica, compras, personal, calidad, admin.
 * Cada módulo expone `ver` (lectura) y `editar` (escritura).
 */
class PermisoSeeder extends Seeder
{
    /**
     * Módulos de la aplicación.
     *
     * @var list<string>
     */
    public const MODULOS = [
        'panel',
        'programa',
        'pmi',
        'logistica',
        'compras',
        'personal',
        'calidad',
        'admin',
    ];

    /**
     * Matriz aprobada rol × módulo.
     *
     * Cada rol declara los módulos donde puede `ver` y, opcionalmente, `editar`.
     *
     * @var array<string, array<string, 'ver'|'editar'>>
     */
    public const MATRIZ = [
        'gerente_general' => [
            'panel' => 'ver', 'programa' => 'ver', 'pmi' => 'ver', 'logistica' => 'ver',
            'compras' => 'ver', 'personal' => 'ver', 'calidad' => 'ver',
        ],
        'planificacion_administracion' => [
            'panel' => 'ver', 'programa' => 'ver', 'pmi' => 'ver', 'personal' => 'ver',
            'calidad' => 'ver', 'admin' => 'editar',
        ],
        'area_tecnica' => [
            'panel' => 'ver', 'programa' => 'ver', 'pmi' => 'editar', 'calidad' => 'ver',
        ],
        'area_financiera' => [
            'panel' => 'ver', 'programa' => 'ver', 'pmi' => 'ver', 'compras' => 'ver',
        ],
        'residente_obra' => [
            'panel' => 'ver', 'pmi' => 'editar', 'logistica' => 'editar',
            'compras' => 'ver', 'personal' => 'ver', 'calidad' => 'editar',
        ],
        'maestro_obra' => [
            'panel' => 'ver', 'pmi' => 'ver', 'logistica' => 'ver',
            'personal' => 'ver', 'calidad' => 'ver',
        ],
        'obrero_obra' => [
            'panel' => 'ver', 'personal' => 'ver',
        ],
        'almacenero_obra' => [
            'panel' => 'ver', 'logistica' => 'editar',
        ],
        'jefe_logistica_compras' => [
            'panel' => 'ver', 'logistica' => 'editar', 'compras' => 'editar',
        ],
        'jefe_recursos_humanos' => [
            'panel' => 'ver', 'personal' => 'editar',
        ],
        'prevencionista_ssoma' => [
            'panel' => 'ver', 'pmi' => 'ver', 'personal' => 'editar', 'calidad' => 'ver',
        ],
        'supervisor_ambiental' => [
            'panel' => 'ver', 'pmi' => 'ver', 'personal' => 'ver', 'calidad' => 'editar',
        ],
        'oficina_tecnica' => [
            'panel' => 'ver', 'programa' => 'ver', 'pmi' => 'editar',
            'logistica' => 'ver', 'calidad' => 'ver',
        ],
        'proveedor' => [
            'panel' => 'ver', 'compras' => 'ver',
        ],
        'banco_fideicomitente' => [
            'panel' => 'ver', 'programa' => 'ver', 'pmi' => 'ver',
        ],
        'supervision_obra_entidad' => [
            'panel' => 'ver', 'programa' => 'ver', 'pmi' => 'ver',
            'logistica' => 'ver', 'calidad' => 'ver',
        ],
        'administrador_sistema' => [
            'panel' => 'editar', 'programa' => 'editar', 'pmi' => 'editar',
            'logistica' => 'editar', 'compras' => 'editar', 'personal' => 'editar',
            'calidad' => 'editar', 'admin' => 'editar',
        ],
        'auditor' => [
            'panel' => 'ver', 'programa' => 'ver', 'pmi' => 'ver', 'logistica' => 'ver',
            'compras' => 'ver', 'personal' => 'ver', 'calidad' => 'ver', 'admin' => 'ver',
        ],
    ];

    public function run(): void
    {
        $this->sembrarRoles();
        $this->sembrarPermisos();
        $this->sembrarMatriz();
    }

    private function sembrarRoles(): void
    {
        $roles = [
            ['codigo' => 'gerente_general', 'nombre' => 'Gerente General', 'es_externo' => false],
            ['codigo' => 'planificacion_administracion', 'nombre' => 'Área de Planificación/Administración', 'es_externo' => false],
            ['codigo' => 'area_tecnica', 'nombre' => 'Área Técnica/Ingeniería', 'es_externo' => false],
            ['codigo' => 'area_financiera', 'nombre' => 'Área Financiera', 'es_externo' => false],
            ['codigo' => 'residente_obra', 'nombre' => 'Residente de Obra', 'es_externo' => false],
            ['codigo' => 'maestro_obra', 'nombre' => 'Maestro de Obra / Cuadrillas', 'es_externo' => false],
            ['codigo' => 'obrero_obra', 'nombre' => 'Obrero / Personal de Obra', 'es_externo' => false],
            ['codigo' => 'almacenero_obra', 'nombre' => 'Almacenero de Obra', 'es_externo' => false],
            ['codigo' => 'jefe_logistica_compras', 'nombre' => 'Jefe de Logística / Compras', 'es_externo' => false],
            ['codigo' => 'jefe_recursos_humanos', 'nombre' => 'Jefe de Recursos Humanos', 'es_externo' => false],
            ['codigo' => 'prevencionista_ssoma', 'nombre' => 'Prevencionista SSOMA / Especialista SST', 'es_externo' => false],
            ['codigo' => 'supervisor_ambiental', 'nombre' => 'Supervisor Ambiental', 'es_externo' => false],
            ['codigo' => 'oficina_tecnica', 'nombre' => 'Oficina Técnica', 'es_externo' => false],
            ['codigo' => 'proveedor', 'nombre' => 'Proveedor', 'es_externo' => true],
            ['codigo' => 'banco_fideicomitente', 'nombre' => 'Banco Fideicomitente', 'es_externo' => true],
            ['codigo' => 'supervision_obra_entidad', 'nombre' => 'Supervisión de Obra (Entidad)', 'es_externo' => true],
            ['codigo' => 'administrador_sistema', 'nombre' => 'Administrador del Sistema', 'es_externo' => false],
            ['codigo' => 'auditor', 'nombre' => 'Auditor', 'es_externo' => false],
        ];

        foreach ($roles as $rol) {
            DB::table('roles')->updateOrInsert(
                ['codigo' => $rol['codigo']],
                [
                    'nombre' => $rol['nombre'],
                    'es_externo' => $rol['es_externo'],
                    'updated_at' => now(),
                    'created_at' => now(),
                ],
            );
        }
    }

    private function sembrarPermisos(): void
    {
        foreach (self::MODULOS as $modulo) {
            foreach (['ver' => 'Ver', 'editar' => 'Editar'] as $accion => $etiqueta) {
                DB::table('permisos')->updateOrInsert(
                    ['codigo' => "{$modulo}.{$accion}"],
                    [
                        'modulo' => $modulo,
                        'descripcion' => "{$etiqueta} el módulo {$modulo}",
                        'updated_at' => now(),
                        'created_at' => now(),
                    ],
                );
            }
        }
    }

    private function sembrarMatriz(): void
    {
        $roles = DB::table('roles')->pluck('id', 'codigo');
        $permisos = DB::table('permisos')->pluck('id', 'codigo');

        foreach (self::MATRIZ as $rolCodigo => $modulos) {
            $rolId = $roles[$rolCodigo] ?? null;

            if (! $rolId) {
                continue;
            }

            $codigos = [];

            foreach ($modulos as $modulo => $nivel) {
                $codigos[] = "{$modulo}.ver";

                if ($nivel === 'editar') {
                    $codigos[] = "{$modulo}.editar";
                }
            }

            $ids = collect($codigos)
                ->map(fn (string $codigo) => $permisos[$codigo] ?? null)
                ->filter()
                ->values();

            DB::table('permiso_rol')->where('rol_id', $rolId)->delete();

            foreach ($ids as $permisoId) {
                DB::table('permiso_rol')->updateOrInsert([
                    'rol_id' => $rolId,
                    'permiso_id' => $permisoId,
                ]);
            }
        }
    }
}
