<?php

use App\Models\ParametroSistema;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('un invitado no puede administrar parámetros', function () {
    $this->getJson('/api/v1/parametros')->assertUnauthorized();
    $this->postJson('/api/v1/parametros', [
        'clave' => 'clave.publica',
        'valor' => '1',
        'tipo' => 'numero',
    ])->assertUnauthorized();
});

test('un usuario sin permiso de administración no puede crear parámetros', function () {
    $this->actingAs($this->usuarioConRol('obrero_obra'));

    $this->postJson('/api/v1/parametros', [
        'clave' => 'clave.protegida',
        'valor' => '1',
        'tipo' => 'numero',
    ])->assertForbidden();
});

test('el administrador crea, edita y elimina parámetros con clave única', function () {
    $this->actingAs($this->usuarioConRol());

    $this->postJson('/api/v1/parametros', [
        'clave' => 'geo.radio_busqueda_m',
        'valor' => '25000',
        'tipo' => 'numero',
        'descripcion' => 'Radio de búsqueda geodésica',
    ])->assertCreated()
        ->assertJsonPath('data.clave', 'geo.radio_busqueda_m');

    $this->assertDatabaseHas('parametros_sistema', [
        'clave' => 'geo.radio_busqueda_m',
        'valor' => '25000',
    ]);

    $this->postJson('/api/v1/parametros', [
        'clave' => 'geo.radio_busqueda_m',
        'valor' => '30000',
        'tipo' => 'numero',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('clave');

    $parametro = ParametroSistema::query()->where('clave', 'geo.radio_busqueda_m')->firstOrFail();

    $this->putJson("/api/v1/parametros/{$parametro->id}", [
        'clave' => 'geo.radio_busqueda_m',
        'valor' => '30000',
        'tipo' => 'numero',
    ])->assertOk()
        ->assertJsonPath('data.valor', '30000');

    $this->assertDatabaseHas('parametros_sistema', [
        'id' => $parametro->id,
        'valor' => '30000',
    ]);

    $this->deleteJson("/api/v1/parametros/{$parametro->id}")->assertOk();

    $this->assertDatabaseMissing('parametros_sistema', ['id' => $parametro->id]);
});

test('un usuario autenticado puede consultar los parámetros', function () {
    ParametroSistema::create([
        'clave' => 'stock.alerta_critica',
        'valor' => 'true',
        'tipo' => 'booleano',
    ]);

    $this->actingAs($this->usuarioConRol('obrero_obra'));

    $this->getJson('/api/v1/parametros')
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonCount(1, 'data');
});
