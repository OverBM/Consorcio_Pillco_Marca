<?php

use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function usuarioMetricasPanel(): Usuario
{
    return Usuario::create([
        'name' => 'Metricas Test',
        'email' => 'metricas.test@pillcomarca.pe',
        'password' => Hash::make('password123'),
        'activo' => true,
    ]);
}

test('el panel expone las métricas nuevas del bolt 001', function () {
    $this->seed();

    $this->actingAsConRol(usuarioMetricasPanel())
        ->get('/panel')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('PanelGeneral')
            ->loadDeferredProps(fn (Assert $page) => $page
                ->has('metricasInventario', fn (Assert $metricas) => $metricas
                    ->has('valor')
                    ->has('variacionPct')
                    ->has('stockCritico')
                    ->has('skusTotales')
                    ->has('transferenciasTransito')
                    ->has('serie30d', 30)
                    ->has('saludAlmacenes')
                    ->etc()
                )
                ->has('nivelServicio', fn (Assert $nivel) => $nivel
                    ->has('indice')
                    ->has('componentes', fn (Assert $componentes) => $componentes
                        ->has('cumplimiento')
                        ->has('puntualidad')
                        ->has('disponibilidad')
                        ->has('precision')
                        ->etc()
                    )
                    ->has('detalle')
                    ->etc()
                )
                ->has('programaPmi', fn (Assert $programa) => $programa
                    ->has('obrasActivas')
                    ->has('avancePonderado')
                    ->has('spi')
                    ->has('cpi')
                    ->has('hitosProximos')
                    ->has('hitos')
                    ->etc()
                )
            )
            ->etc()
        );
});

test('los badges por módulo se comparten con la navegación', function () {
    $this->seed();

    $this->actingAsConRol(usuarioMetricasPanel())
        ->get('/panel')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('badges', fn (Assert $badges) => $badges
                ->has('panel-general')
                ->has('matriz-stock')
                ->has('requerimientos')
                ->has('programa-redistribucion')
                ->has('asistencia-geocerca')
                ->has('observaciones-tecnicas')
                ->has('solicitudes-acceso')
                ->etc()
            )
            ->etc()
        );
});
