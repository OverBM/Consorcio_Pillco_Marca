<?php

use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function crearUsuarioPerfil(): Usuario
{
    return Usuario::create([
        'name' => 'Ana Torres',
        'email' => 'ana.torres@pillcomarca.pe',
        'password' => 'Actual1234!',
        'dni' => '87654321',
        'telefono' => '999111222',
        'activo' => true,
    ]);
}

test('muestra el perfil del usuario autenticado', function () {
    $usuario = crearUsuarioPerfil();

    $this->actingAsConRol($usuario)
        ->get('/perfil')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('PerfilPage')
            ->where('perfil.email', 'ana.torres@pillcomarca.pe')
            ->where('perfil.dni', '87654321')
            ->where('perfil.telefono', '999111222'));
});

test('permite actualizar nombre y teléfono', function () {
    $usuario = crearUsuarioPerfil();

    $this->actingAsConRol($usuario)
        ->patchJson('/perfil', ['name' => 'Ana T. Torres', 'telefono' => '988777666'])
        ->assertOk()
        ->assertJsonPath('success', true);

    $usuario->refresh();
    expect($usuario->name)->toBe('Ana T. Torres');
    expect($usuario->telefono)->toBe('988777666');
});

test('cambia la contraseña con la actual correcta y una nueva que cumple la política', function () {
    $usuario = crearUsuarioPerfil();

    $this->actingAsConRol($usuario)
        ->patchJson('/perfil/password', [
            'current_password' => 'Actual1234!',
            'password' => 'NuevaClave1!',
            'password_confirmation' => 'NuevaClave1!',
        ])
        ->assertOk()
        ->assertJsonPath('success', true);

    expect(Hash::check('NuevaClave1!', $usuario->fresh()->password))->toBeTrue();
});

test('rechaza el cambio cuando la contraseña actual es incorrecta', function () {
    $usuario = crearUsuarioPerfil();

    $this->actingAsConRol($usuario)
        ->patchJson('/perfil/password', [
            'current_password' => 'incorrecta',
            'password' => 'NuevaClave1!',
            'password_confirmation' => 'NuevaClave1!',
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('current_password');
});

test('rechaza una nueva contraseña que no cumple la política', function () {
    $usuario = crearUsuarioPerfil();

    $this->actingAsConRol($usuario)
        ->patchJson('/perfil/password', [
            'current_password' => 'Actual1234!',
            'password' => 'debil',
            'password_confirmation' => 'debil',
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('password');
});
