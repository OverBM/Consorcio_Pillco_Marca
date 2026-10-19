<?php

use App\Models\Auditoria;
use App\Models\Obra;
use App\Models\Programa;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('las altas, cambios y bajas quedan auditadas con usuario, IP y cadena válida', function () {
    $usuario = Usuario::create([
        'name' => 'Auditor Prueba',
        'email' => 'auditor.prueba@pillcomarca.pe',
        'password' => Hash::make('password123'),
        'activo' => true,
    ]);

    $this->actingAs($usuario);

    $programa = Programa::create([
        'nombre' => 'Programa Auditoría',
        'estado' => 'activo',
    ]);

    $obra = Obra::create([
        'programa_id' => $programa->id,
        'codigo' => 'OBR-AUD',
        'nombre' => 'Obra Auditada',
        'estado' => 'ejecucion',
        'distrito' => 'El Tambo',
    ]);

    $obra->update(['nombre' => 'Obra Auditada Actualizada']);
    $obra->delete();

    $acciones = Auditoria::query()
        ->where('entidad', 'obras')
        ->pluck('accion')
        ->all();

    expect($acciones)->toContain('crear', 'actualizar', 'eliminar');

    $creacion = Auditoria::query()
        ->where('entidad', 'obras')
        ->where('accion', 'crear')
        ->firstOrFail();

    expect($creacion->usuario_id)->toBe($usuario->id)
        ->and($creacion->ip)->not->toBeNull()
        ->and($creacion->hash_registro)->not->toBeNull();

    expect(Auditoria::verificarCadena())->toMatchArray([
        'valida' => true,
        'rota_en' => null,
    ]);
});

test('la cadena detecta una alteración manual de la bitácora', function () {
    $usuario = Usuario::create([
        'name' => 'Cadena Prueba',
        'email' => 'cadena@pillcomarca.pe',
        'password' => Hash::make('password123'),
        'activo' => true,
    ]);

    $this->actingAs($usuario);

    $programa = Programa::create([
        'nombre' => 'Programa Cadena',
        'estado' => 'activo',
    ]);

    Obra::create([
        'programa_id' => $programa->id,
        'codigo' => 'OBR-CHAIN',
        'nombre' => 'Obra Cadena',
        'estado' => 'ejecucion',
        'distrito' => 'Chilca',
    ]);

    $registro = Auditoria::query()->orderBy('id')->firstOrFail();

    DB::table('auditorias')->where('id', $registro->id)->update(['accion' => 'accion_alterada']);

    $verificacion = Auditoria::verificarCadena();

    expect($verificacion['valida'])->toBeFalse()
        ->and($verificacion['rota_en'])->toBe($registro->id);
});

test('el login, el logout y el cambio de contexto registran auditoría', function () {
    $usuario = Usuario::create([
        'name' => 'Sesión Prueba',
        'email' => 'sesion@pillcomarca.pe',
        'password' => Hash::make('password123'),
        'activo' => true,
    ]);

    $programa = Programa::create([
        'nombre' => 'Programa Sesión',
        'estado' => 'activo',
    ]);

    $obra = Obra::create([
        'programa_id' => $programa->id,
        'codigo' => 'OBR-SES',
        'nombre' => 'Obra Sesión',
        'estado' => 'ejecucion',
        'distrito' => 'El Tambo',
    ]);

    $this->post('/login', [
        'email' => 'sesion@pillcomarca.pe',
        'password' => 'password123',
    ])->assertRedirect('/panel');

    $this->assertAuthenticatedAs($usuario);

    $this->post('/contexto', ['obra_activa_id' => $obra->id])->assertRedirect();

    $this->post('/logout');

    $acciones = Auditoria::query()
        ->where('usuario_id', $usuario->id)
        ->pluck('accion')
        ->all();

    expect($acciones)->toContain('login', 'cambio_contexto', 'logout');
    expect(Auditoria::verificarCadena()['valida'])->toBeTrue();
});

function registrarAuditoriaPrueba(string $entidad, ?int $usuarioId): void
{
    Auditoria::registrar('crear', $entidad, null, null, ['entidad' => $entidad], $usuarioId);
}

test('la bitácora filtra por usuario y por módulo', function () {
    $admin = $this->usuarioConRol('administrador_sistema');
    $otro = Usuario::create([
        'name' => 'Usuario Bitácora',
        'email' => 'bitacora@pillcomarca.pe',
        'password' => Hash::make('password123'),
        'activo' => true,
    ]);

    registrarAuditoriaPrueba('almacenes', $admin->id);
    registrarAuditoriaPrueba('stock_almacen', $admin->id);
    registrarAuditoriaPrueba('partidas', $otro->id);

    $this->actingAsConRol($admin)
        ->get('/admin/auditoria?modulo=almacen_logistica')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('AuditoriaPage')
            ->where('filtros.modulo', 'almacen_logistica')
            ->has('auditoriaDb.data', 2));

    $this->get('/admin/auditoria?usuario_id='.$otro->id)
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filtros.usuario_id', (string) $otro->id)
            ->has('auditoriaDb.data', 1));
});

test('la bitácora pagina los registros de 25 en 25', function () {
    $admin = $this->usuarioConRol('administrador_sistema');

    for ($i = 0; $i < 30; $i++) {
        registrarAuditoriaPrueba('almacenes', $admin->id);
    }

    $this->actingAsConRol($admin)
        ->get('/admin/auditoria')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('AuditoriaPage')
            ->where('auditoriaDb.current_page', 1)
            ->has('auditoriaDb.data', 25));

    $this->get('/admin/auditoria?page=2')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('auditoriaDb.current_page', 2)
            ->has('auditoriaDb.data', 5));
});
