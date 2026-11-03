<?php

use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

function usuarioBusqueda(string $email = 'busqueda@pillcomarca.pe'): Usuario
{
    return Usuario::create([
        'name' => 'Busqueda Test',
        'email' => $email,
        'password' => Hash::make('password123'),
        'activo' => true,
    ]);
}

test('la búsqueda global exige autenticación', function () {
    $this->getJson('/api/v1/buscar?q=obra')->assertUnauthorized();
});

test('la búsqueda global valida el término mínimo', function () {
    $this->actingAs(usuarioBusqueda())
        ->getJson('/api/v1/buscar?q=a')
        ->assertUnprocessable()
        ->assertJsonValidationErrors('q');
});

test('devuelve resultados agrupados por tipo', function () {
    $this->seed();

    $respuesta = $this->actingAsConRol(usuarioBusqueda())
        ->getJson('/api/v1/buscar?q=OBR')
        ->assertOk()
        ->assertJsonPath('termino', 'OBR');

    $grupos = collect($respuesta->json('grupos'))->keyBy('tipo');

    expect($grupos->has('obras'))->toBeTrue()
        ->and($grupos['obras']['items'])->not->toBeEmpty();

    foreach ($grupos as $grupo) {
        expect(count($grupo['items']))->toBeLessThanOrEqual(5);
    }
});

test('no expone compras a quien no tiene permiso', function () {
    $this->seed();

    $usuario = usuarioBusqueda();

    $this->actingAsConRol($usuario, 'obrero_obra');

    $respuesta = $this->getJson('/api/v1/buscar?q=aceros')
        ->assertOk();

    $tipos = collect($respuesta->json('grupos'))->pluck('tipo');

    expect($tipos)->not->toContain('ordenes_compra')
        ->and($tipos)->not->toContain('proveedores');
});

test('expone compras cuando el rol tiene el permiso', function () {
    $this->seed();

    $usuario = usuarioBusqueda('busqueda.compras@pillcomarca.pe');

    $this->actingAsConRol($usuario, 'jefe_logistica_compras');

    $respuesta = $this->getJson('/api/v1/buscar?q=aceros')->assertOk();

    $tipos = collect($respuesta->json('grupos'))->pluck('tipo');

    expect($tipos)->toContain('ordenes_compra');
});

test('escapa comodines en el término', function () {
    $this->seed();

    $this->actingAsConRol(usuarioBusqueda())
        ->getJson('/api/v1/buscar?q=a%25b')
        ->assertOk()
        ->assertJsonPath('grupos', fn ($grupos) => is_array($grupos));
});
