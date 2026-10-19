<?php

use App\Models\ParametroSistema;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function administradorDePrueba(): Usuario
{
    return Usuario::create([
        'name' => 'Administrador de Prueba',
        'email' => 'admin@pillcomarca.pe',
        'password' => bcrypt('password123'),
        'activo' => true,
    ]);
}

test('el POST web admin.parametros.update persiste un parámetro existente', function () {
    $this->actingAsConRol(administradorDePrueba());

    ParametroSistema::create([
        'clave' => 'geo.radio_busqueda_m',
        'valor' => '50000',
        'tipo' => 'numero',
    ]);

    $this->post('/admin/parametros', [
        'clave' => 'geo.radio_busqueda_m',
        'valor' => '75000',
    ])->assertRedirect();

    $this->assertDatabaseHas('parametros_sistema', [
        'clave' => 'geo.radio_busqueda_m',
        'valor' => '75000',
    ]);
});

test('el POST web admin.parametros.update valida las claves inexistentes', function () {
    $this->actingAsConRol(administradorDePrueba());

    $this->post('/admin/parametros', [
        'clave' => 'clave.inventada',
        'valor' => '1',
    ])->assertSessionHasErrors('clave');
});
