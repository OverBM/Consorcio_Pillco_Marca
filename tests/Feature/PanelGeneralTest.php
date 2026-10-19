<?php

use App\Models\Almacen;
use App\Models\Obra;
use App\Models\ParametroSistema;
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

    $response = $this->actingAsConRol(usuarioPanel())->get('/panel');

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('PanelGeneral')
        ->has('obrasDb')
        ->has('almacenesDb')
        ->has('materialesDb')
        ->has('stock.stock')
        ->has('stock.reservas')
        ->has('obrasRedDb')
        ->has('almacenesRedDb')
        ->has('stockRed.stock')
        ->has('stockRed.reservas')
        ->loadDeferredProps(fn (Assert $page) => $page
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
        )
        ->etc()
    );
});

test('el panel calcula indicadores no nulos con los datos sembrados', function () {
    $this->seed();

    $response = $this->actingAsConRol(usuarioPanel())->get('/panel');

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('PanelGeneral')
        ->loadDeferredProps(fn (Assert $page) => $page
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
        )
        ->etc()
    );
});

test('el panel representa la red completa aunque exista contexto activo', function () {
    $this->seed();

    $obraActiva = Obra::where('codigo', 'OBR-01')->firstOrFail();

    $response = $this->actingAsConRol(usuarioPanel())
        ->withSession(['obra_activa_id' => $obraActiva->id])
        ->get('/panel');

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('PanelGeneral')
        ->has('obrasDb', 1)
        ->has('obrasRedDb', 3)
        ->has('almacenesRedDb', 3)
        ->has('stockRed.stock')
        ->has('stockRed.reservas')
        ->where('almacenCentralId', fn ($id) => is_string($id) && $id !== '')
        ->loadDeferredProps(fn (Assert $page) => $page
            ->has('sobrantes', 1)
            ->has('rutas', 1)
        )
        ->etc()
    );
});

test('el panel resuelve el almacen central desde el parametro configurado', function () {
    $this->seed();

    $almacen = Almacen::where('codigo', 'ALM-02')->firstOrFail();
    ParametroSistema::where('clave', 'logistica.almacen_central_id')->delete();
    ParametroSistema::create([
        'clave' => 'logistica.almacen_central_id',
        'valor' => (string) $almacen->id,
        'tipo' => 'numero',
        'descripcion' => 'Almacen central configurado',
    ]);

    $response = $this->actingAsConRol(usuarioPanel())->get('/panel');

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('PanelGeneral')
        ->where('almacenCentralId', (string) $almacen->id)
        ->etc()
    );
});

test('el panel responde con props vacios cuando no hay datos', function () {
    $response = $this->actingAsConRol(usuarioPanel())->get('/panel');

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('PanelGeneral')
        ->where('almacenCentralId', null)
        ->loadDeferredProps(fn (Assert $page) => $page
            ->where('sobrantes', [])
            ->where('rutas', [])
            ->where('indicadores.solicitudes', 0)
            ->where('indicadores.stockCritico', 0)
        )
        ->etc()
    );
});
