<?php

use App\Models\Almacen;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function usuarioReportes(string $email = 'reportes@pillcomarca.pe'): Usuario
{
    return Usuario::create([
        'name' => 'Reportes Test',
        'email' => $email,
        'password' => Hash::make('password123'),
        'activo' => true,
    ]);
}

test('el módulo de reportes exige autenticación', function () {
    $this->get('/reportes')->assertRedirect('/login');
});

test('los reportes exponen indicadores y catálogos desde datos reales', function () {
    $this->seed();

    $usuario = usuarioReportes();
    $this->actingAsConRol($usuario, 'administrador_sistema');

    $this->get('/reportes')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('ReportesPage')
            ->has('reportes.indicadores')
            ->has('reportes.serie')
            ->has('reportes.categorias')
            ->has('reportes.materiales')
            ->has('catalogos.obras')
            ->has('catalogos.almacenes')
            ->has('catalogos.categorias')
            ->where('reportes.filtros.desde', fn ($desde) => is_string($desde))
            ->etc()
        );
});

test('los filtros de fecha y almacén se reflejan en los props', function () {
    $this->seed();

    $usuario = usuarioReportes('reportes.filtros@pillcomarca.pe');
    $this->actingAsConRol($usuario, 'administrador_sistema');

    $almacenId = Almacen::query()->value('id');

    $this->get("/reportes?desde=2026-01-01&hasta=2026-01-31&almacen_id={$almacenId}&categoria_id=1")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('reportes.filtros.desde', '2026-01-01')
            ->where('reportes.filtros.hasta', '2026-01-31')
            ->where('reportes.filtros.almacen_id', (int) $almacenId)
            ->where('reportes.filtros.categoria_id', 1)
            ->etc()
        );
});
