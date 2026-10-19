<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('un invitado es redirigido al login en los módulos del panel', function () {
    $this->get('/panel')->assertRedirect('/login');
    $this->get('/stock')->assertRedirect('/login');
    $this->get('/admin/usuarios')->assertRedirect('/login');
});

test('el menú y las rutas respetan los permisos del rol', function () {
    $usuario = $this->usuarioConRol('obrero_obra');

    $this->actingAs($usuario);

    $this->get('/panel')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('auth.user.permisos', fn ($permisos) => collect($permisos)->contains('panel.ver'))
            ->where('auth.user.permisos', fn ($permisos) => ! collect($permisos)->contains('pmi.editar'))
            ->etc()
        );

    $this->get('/personal/asistencia')->assertOk();
    $this->get('/stock')->assertForbidden();
    $this->get('/gestion-obra/partidas')->assertForbidden();
    $this->get('/admin/usuarios')->assertForbidden();
});

test('el administrador accede a todos los módulos', function () {
    $this->actingAs($this->usuarioConRol());

    $this->get('/panel')->assertOk();
    $this->get('/stock')->assertOk();
    $this->get('/gestion-obra/partidas')->assertOk();
    $this->get('/compras')->assertOk();
    $this->get('/personal/asistencia')->assertOk();
    $this->get('/calidad/observaciones')->assertOk();
    $this->get('/admin/usuarios')->assertOk();
    $this->get('/admin/parametros')->assertOk();
});

test('el auditor consulta la administración pero no puede escribir parámetros', function () {
    $this->actingAs($this->usuarioConRol('auditor'));

    $this->get('/admin/parametros')->assertOk();

    $this->post('/admin/parametros', [
        'ahp_peso_distancia' => 0.45,
        'ahp_peso_stock' => 0.35,
        'ahp_peso_criticidad' => 0.20,
        'factor_sinuosidad_vial' => 1.40,
    ])->assertForbidden();
});
