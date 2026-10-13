<?php

use App\Models\Obra;
use App\Models\Programa;
use App\Models\Rol;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function contextoUsuarios(): array
{
    $rol = Rol::create(['codigo' => 'residente_obra', 'nombre' => 'Residente de Obra']);

    $programa = Programa::create(['nombre' => 'Programa Usuarios', 'estado' => 'activo']);

    $obra = Obra::create([
        'programa_id' => $programa->id,
        'codigo' => 'OBR-USR',
        'nombre' => 'Obra Usuarios',
        'estado' => 'ejecucion',
        'distrito' => 'Huancayo',
    ]);

    return [$rol, $obra];
}

test('el endpoint de usuarios lista los usuarios con rol y obra', function () {
    [$rol, $obra] = contextoUsuarios();

    $usuario = Usuario::create([
        'name' => 'Ing. Carlos Mendoza',
        'email' => 'residente@pillcomarca.pe',
        'password' => bcrypt('password123'),
        'activo' => true,
    ]);
    $usuario->roles()->sync([$rol->id]);
    $usuario->obras()->sync([$obra->id => ['rol_id' => $rol->id]]);

    $this->getJson('/api/v1/usuarios')
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.email', 'residente@pillcomarca.pe')
        ->assertJsonPath('data.0.roles.0.codigo', 'residente_obra')
        ->assertJsonPath('data.0.obras.0.nombre', 'Obra Usuarios');
});

test('el endpoint de usuarios registra un usuario con su rol y alcance', function () {
    [, $obra] = contextoUsuarios();

    $response = $this->postJson('/api/v1/usuarios', [
        'name' => 'Lic. Mariana Rojas',
        'email' => 'logistica@pillcomarca.pe',
        'password' => 'password123',
        'dni' => '46789012',
        'rol_codigo' => 'residente_obra',
        'obra_id' => $obra->id,
        'activo' => true,
    ]);

    $response->assertCreated()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.roles.0.codigo', 'residente_obra')
        ->assertJsonPath('data.obras.0.nombre', 'Obra Usuarios');

    $this->assertDatabaseHas('usuario_rol', ['usuario_id' => $response->json('data.id')]);
});

test('el endpoint de usuarios rechaza correos duplicados', function () {
    [$rol] = contextoUsuarios();

    Usuario::create([
        'name' => 'Existente',
        'email' => 'duplicado@pillcomarca.pe',
        'password' => bcrypt('password123'),
    ]);

    $response = $this->postJson('/api/v1/usuarios', [
        'name' => 'Nuevo',
        'email' => 'duplicado@pillcomarca.pe',
        'password' => 'password123',
        'rol_codigo' => $rol->codigo,
    ]);

    $response->assertUnprocessable()->assertJsonValidationErrors('email');
});

test('el endpoint de usuarios actualiza el estado y rol de un usuario', function () {
    [$rol] = contextoUsuarios();

    $usuario = Usuario::create([
        'name' => 'Usuario Editable',
        'email' => 'editable@pillcomarca.pe',
        'password' => bcrypt('password123'),
        'activo' => true,
    ]);

    $response = $this->putJson("/api/v1/usuarios/{$usuario->id}", [
        'name' => 'Usuario Actualizado',
        'rol_codigo' => $rol->codigo,
        'activo' => false,
    ]);

    $response->assertOk()
        ->assertJsonPath('data.name', 'Usuario Actualizado')
        ->assertJsonPath('data.activo', false);

    $this->assertDatabaseHas('usuarios', [
        'id' => $usuario->id,
        'name' => 'Usuario Actualizado',
        'activo' => false,
    ]);
});
