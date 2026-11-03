<?php

namespace Tests\Feature;

use App\Models\RuteoConsumo;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AnaliticaPaginaTest extends TestCase
{
    use RefreshDatabase;

    public function test_jefe_de_logistica_accede_al_modulo_de_analitica(): void
    {
        $usuario = Usuario::create([
            'name' => 'Jefe de Logística',
            'email' => 'jefe.analitica@pillcomarca.pe',
            'password' => bcrypt('secret123'),
            'activo' => true,
        ]);
        $this->actingAsConRol($usuario, 'jefe_logistica_compras');

        RuteoConsumo::create([
            'fecha' => now()->toDateString(),
            'driver' => 'ors',
            'llamadas' => 120,
            'exitos' => 118,
            'fallos' => 2,
            'geocodificaciones' => 7,
        ]);

        $this->get('/analitica')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('AnaliticaPage')
                ->has('resumen')
                ->has('parametrosDb')
                ->has('alertasDb')
                ->has('ejecucionesDb')
                ->where('cuotaRuteo.usadas', 120)
                ->where('cuotaRuteo.limite', 1500)
                ->where('cuotaRuteo.porcentaje', 8)
                ->has('cuotaRuteoSemana')
                ->has('serieAnalitica.serie')
                ->etc()
            );
    }

    public function test_jefe_puede_regenerar_la_analitica_desde_la_interfaz(): void
    {
        $usuario = Usuario::create([
            'name' => 'Jefe de Analítica',
            'email' => 'regenerar.analitica@pillcomarca.pe',
            'password' => bcrypt('secret123'),
            'activo' => true,
        ]);
        $this->actingAsConRol($usuario, 'jefe_logistica_compras');

        Artisan::shouldReceive('call')
            ->once()
            ->with('analitica:ejecutar', ['--origen' => 'manual'])
            ->andReturn(0);
        Artisan::shouldReceive('output')
            ->andReturn('Analítica completada: 12 parámetros, 360 pronósticos, 18 alertas.');

        $this->postJson('/api/v1/analitica/ejecutar')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.pronosticos', 360);
    }

    public function test_obrero_no_accede_al_modulo_de_analitica(): void
    {
        $usuario = Usuario::create([
            'name' => 'Obrero',
            'email' => 'obrero.analitica@pillcomarca.pe',
            'password' => bcrypt('secret123'),
            'activo' => true,
        ]);
        $this->actingAsConRol($usuario, 'obrero_obra');

        $this->get('/analitica')->assertForbidden();
    }
}
