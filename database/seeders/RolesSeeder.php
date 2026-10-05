<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class RolesSeeder extends Seeder
{
    public function run(): void
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
                ['nombre' => $rol['nombre'], 'es_externo' => $rol['es_externo'], 'updated_at' => now(), 'created_at' => now()]
            );
        }

        // Usuarios del sistema por rol
        $usuariosIniciales = [
            [
                'name' => 'Administrador Consorcio',
                'email' => 'admin@pillcomarca.pe',
                'password' => Hash::make('12345678'),
                'dni' => '44556677',
                'telefono' => '964123456',
                'rol' => 'administrador_sistema',
            ],
            [
                'name' => 'Ing. Carlos Mendoza (Residente)',
                'email' => 'residente.chupaca@pillcomarca.pe',
                'password' => Hash::make('password123'),
                'dni' => '45678901',
                'telefono' => '964987654',
                'rol' => 'residente_obra',
            ],
            [
                'name' => 'Lic. Mariana Rojas (Logística)',
                'email' => 'logistica@pillcomarca.pe',
                'password' => Hash::make('password123'),
                'dni' => '46789012',
                'telefono' => '964112233',
                'rol' => 'jefe_logistica_compras',
            ],
            [
                'name' => 'Roberto Quispe (Almacenero)',
                'email' => 'almacen.central@pillcomarca.pe',
                'password' => Hash::make('password123'),
                'dni' => '47890123',
                'telefono' => '964445566',
                'rol' => 'almacenero_obra',
            ],
            [
                'name' => 'Ing. Luis Barreto (Gerente General)',
                'email' => 'gerencia@pillcomarca.pe',
                'password' => Hash::make('password123'),
                'dni' => '48901234',
                'telefono' => '964778899',
                'rol' => 'gerente_general',
            ],
        ];

        foreach ($usuariosIniciales as $u) {
            DB::table('usuarios')->updateOrInsert(
                ['email' => $u['email']],
                [
                    'name' => $u['name'],
                    'password' => $u['password'],
                    'dni' => $u['dni'],
                    'telefono' => $u['telefono'],
                    'activo' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );

            $userRecord = DB::table('usuarios')->where('email', $u['email'])->first();
            $rolRecord = DB::table('roles')->where('codigo', $u['rol'])->first();

            if ($userRecord && $rolRecord) {
                DB::table('usuario_rol')->updateOrInsert([
                    'usuario_id' => $userRecord->id,
                    'rol_id' => $rolRecord->id,
                ]);
            }
        }
    }
}
