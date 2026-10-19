<?php

use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function crearUsuarioParaLogout(): Usuario
{
    return Usuario::create([
        'name' => 'Auditor de Prueba',
        'email' => 'auditor@pillcomarca.pe',
        'password' => bcrypt('secret123'),
        'activo' => true,
    ]);
}

test('el cierre de sesión responde con una visita de ubicación de Inertia hacia la portada', function () {
    $usuario = crearUsuarioParaLogout();

    $response = $this->actingAsConRol($usuario)
        ->withHeaders(['X-Inertia' => 'true'])
        ->post('/logout');

    $response->assertStatus(409);
    $response->assertHeader('X-Inertia-Location', route('home'));
    $this->assertGuest();
});

test('un cliente no-Inertia es redirigido a la portada tras cerrar sesión', function () {
    $usuario = crearUsuarioParaLogout();

    $response = $this->actingAsConRol($usuario)->post('/logout');

    $response->assertRedirect('/');
    $this->assertGuest();
});

test('cerrar sesión sin estar autenticado redirige a la portada', function () {
    $response = $this->post('/logout');

    $response->assertRedirect('/');
    $this->assertGuest();
});
