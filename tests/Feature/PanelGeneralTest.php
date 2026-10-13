<?php

use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function usuarioPanel(): Usuario
{
    return Usuario::create([
        'name' => 'Panel Test',
        'email' => 'panel.test@pillcomarca.pe',
        'password' => Hash::make('password123'),
        'activo' => true,
    ]);
}

test('el panel expone los props adaptados de la API', function () {
    $this->seed();

    $response = $this->actingAs(usuarioPanel())->get('/panel');

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('PanelGeneral')
        ->has('obrasDb')
        ->has('almacenesDb')
        ->has('materialesDb')
        ->has('stock.stock')
        ->has('stock.reservas')
        ->has('indicadores', fn (Assert $indicadores) => $indicadores
            ->has('solicitudes')
            ->has('requerimientosSobrecosto')
            ->has('ocFletes')
            ->has('stockCritico')
            ->has('transferencias')
            ->has('incidencias')
            ->has('mermas')
            ->etc()
        )
        ->has('sobrantes')
        ->has('rutas')
        ->has('movimientos7d', 7)
        ->etc()
    );
});

test('el panel calcula indicadores no nulos con los datos sembrados', function () {
    $this->seed();

    $response = $this->actingAs(usuarioPanel())->get('/panel');

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('PanelGeneral')
        ->where('indicadores.solicitudes', 2)
        ->where('indicadores.requerimientosSobrecosto', 1)
        ->where('indicadores.ocFletes', 2)
        ->where('indicadores.stockCritico', 1)
        ->where('indicadores.transferencias', 1)
        ->where('indicadores.incidencias', 1)
        ->where('indicadores.mermas', 2)
        ->has('sobrantes', 1)
        ->has('sobrantes.0.receptoras', 1)
        ->has('rutas', 1)
        ->etc()
    );
});

test('el panel responde con props vacíos cuando no hay datos', function () {
    $response = $this->actingAs(usuarioPanel())->get('/panel');

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('PanelGeneral')
        ->where('sobrantes', [])
        ->where('rutas', [])
        ->where('indicadores.solicitudes', 0)
        ->where('indicadores.stockCritico', 0)
        ->etc()
    );
});
