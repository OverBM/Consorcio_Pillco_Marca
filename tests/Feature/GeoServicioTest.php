<?php

namespace Tests\Feature;

use App\Domain\Geo\Drivers\HaversineDriver;
use App\Domain\Geo\Dto\Coordenada;
use App\Domain\Geo\GeocodificacionService;
use App\Domain\Geo\OptimizacionRutaService;
use App\Domain\Geo\RuteoService;
use App\Models\RuteoConsumo;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GeoServicioTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();
        Cache::flush();
    }

    public function test_haversine_calcula_distancia_coherente(): void
    {
        $driver = new HaversineDriver;
        $ruta = $driver->calcular(
            new Coordenada(-12.068, -75.210),
            new Coordenada(-12.080, -75.200),
        );

        $this->assertSame('haversine', $ruta->fuente);
        $this->assertGreaterThan(1000, $ruta->distanciaM);
        $this->assertLessThan(3000, $ruta->distanciaM);
        $this->assertGreaterThan(0, $ruta->duracionS);
    }

    public function test_ors_devuelve_ruta_y_fuente(): void
    {
        Config::set('ruteo.driver', 'ors');
        Config::set('ruteo.ors.key', 'test-key');

        Http::fake([
            '*/v2/directions/*' => Http::response([
                'features' => [[
                    'properties' => ['summary' => ['distance' => 1200.0, 'duration' => 180.0]],
                    'geometry' => ['coordinates' => [[-75.21, -12.06], [-75.20, -12.07]]],
                ]],
            ], 200),
        ]);

        $ruta = app(RuteoService::class)->calcular(
            new Coordenada(-12.06, -75.21),
            new Coordenada(-12.07, -75.20),
        );

        $this->assertSame('ors', $ruta->fuente);
        $this->assertSame(1200.0, $ruta->distanciaM);
        $this->assertCount(2, $ruta->geometria);
    }

    public function test_fallo_del_proveedor_usa_haversine(): void
    {
        Config::set('ruteo.driver', 'ors');
        Config::set('ruteo.ors.key', 'test-key');

        Http::fake(['*/v2/directions/*' => Http::response([], 500)]);

        $ruta = app(RuteoService::class)->calcular(
            new Coordenada(-12.061, -75.211),
            new Coordenada(-12.071, -75.201),
        );

        $this->assertSame('haversine', $ruta->fuente);
    }

    public function test_circuit_breaker_evita_llamadas_tras_tres_fallos(): void
    {
        Config::set('ruteo.driver', 'ors');
        Config::set('ruteo.ors.key', 'test-key');
        Config::set('ruteo.fallos_para_abrir', 3);

        Http::fake(['*/v2/directions/*' => Http::response([], 500)]);

        $servicio = app(RuteoService::class);

        for ($indice = 0; $indice < 4; $indice++) {
            $servicio->calcular(
                new Coordenada(-12.06 - ($indice / 100), -75.21),
                new Coordenada(-12.07 - ($indice / 100), -75.20),
            );
        }

        Http::assertSentCount(3);
    }

    public function test_presupuesto_agotado_usa_haversine(): void
    {
        Config::set('ruteo.driver', 'ors');
        Config::set('ruteo.ors.key', 'test-key');
        Config::set('ruteo.presupuesto_diario', 0);

        Http::fake();

        $ruta = app(RuteoService::class)->calcular(
            new Coordenada(-12.062, -75.212),
            new Coordenada(-12.072, -75.202),
        );

        $this->assertSame('haversine', $ruta->fuente);
        Http::assertNothingSent();
    }

    public function test_consumo_de_ors_se_registra(): void
    {
        Config::set('ruteo.driver', 'ors');
        Config::set('ruteo.ors.key', 'test-key');

        Http::fake([
            '*/v2/directions/*' => Http::response([
                'features' => [[
                    'properties' => ['summary' => ['distance' => 900.0, 'duration' => 120.0]],
                    'geometry' => ['coordinates' => [[-75.21, -12.06], [-75.20, -12.07]]],
                ]],
            ], 200),
        ]);

        app(RuteoService::class)->calcular(
            new Coordenada(-12.063, -75.213),
            new Coordenada(-12.073, -75.203),
        );

        $this->assertDatabaseHas('ruteo_consumos', [
            'driver' => 'ors',
            'llamadas' => 1,
            'exitos' => 1,
        ]);
    }

    public function test_reporte_de_cuota_se_ejecuta(): void
    {
        RuteoConsumo::create([
            'fecha' => now()->toDateString(),
            'driver' => 'ors',
            'llamadas' => 10,
            'exitos' => 9,
            'fallos' => 1,
            'geocodificaciones' => 3,
        ]);

        $this->artisan('ruteo:reporte-cuota')
            ->expectsOutputToContain('Llamadas: 10')
            ->assertSuccessful();
    }

    public function test_sugerencias_de_direccion_usan_cache(): void
    {
        Config::set('ruteo.ors.key', 'test-key');

        Http::fake([
            '*/geocode/search*' => Http::response([
                'features' => [
                    [
                        'geometry' => ['coordinates' => [-75.21, -12.06]],
                        'properties' => ['label' => 'San Carlos, Huancayo, Junín, Perú', 'confidence' => 0.9],
                    ],
                    [
                        'geometry' => ['coordinates' => [-75.20, -12.07]],
                        'properties' => ['label' => 'San Carlos, El Tambo, Junín, Perú', 'confidence' => 0.8],
                    ],
                ],
            ], 200),
        ]);

        $servicio = app(GeocodificacionService::class);
        $primera = $servicio->sugerencias('San Carlos');
        $segunda = $servicio->sugerencias('San Carlos');

        $this->assertCount(2, $primera);
        $this->assertSame('San Carlos, Huancayo, Junín, Perú', $primera[0]['etiqueta']);
        $this->assertSame($primera, $segunda);
        Http::assertSentCount(1);
    }

    public function test_geocodificacion_usa_cache(): void
    {
        Config::set('ruteo.ors.key', 'test-key');

        Http::fake([
            '*/geocode/search*' => Http::response([
                'features' => [[
                    'geometry' => ['coordinates' => [-75.21, -12.06]],
                    'properties' => ['label' => 'Huancayo, Junín, Perú', 'confidence' => 0.9],
                ]],
            ], 200),
        ]);

        $servicio = app(GeocodificacionService::class);
        $primera = $servicio->geocodificar('Av. Real 123, Huancayo');
        $segunda = $servicio->geocodificar('Av. Real 123, Huancayo');

        $this->assertSame(-12.06, $primera['lat']);
        $this->assertSame($primera, $segunda);
        Http::assertSentCount(1);
    }

    public function test_optimizacion_devuelve_orden_y_ahorro(): void
    {
        Config::set('ruteo.driver', 'haversine');

        $paradas = [
            new Coordenada(-12.10, -75.25),
            new Coordenada(-12.07, -75.21),
            new Coordenada(-12.09, -75.23),
        ];

        $resultado = app(OptimizacionRutaService::class)->optimizar(
            new Coordenada(-12.06, -75.20),
            $paradas,
        );

        $this->assertCount(3, $resultado['orden']);
        $this->assertGreaterThan(0, $resultado['distancia_total_m']);
        $this->assertGreaterThanOrEqual(0, $resultado['ahorro_m']);
    }

    public function test_api_geo_respeta_permisos(): void
    {
        Config::set('ruteo.driver', 'haversine');

        $jefe = Usuario::create([
            'name' => 'Jefe Logística',
            'email' => 'jefe.geo@pillcomarca.pe',
            'password' => bcrypt('secret123'),
            'activo' => true,
        ]);
        $this->actingAsConRol($jefe, 'jefe_logistica_compras');

        $this->postJson('/api/v1/geo/ruta', [
            'origen' => ['lat' => -12.06, 'lng' => -75.21],
            'destino' => ['lat' => -12.07, 'lng' => -75.20],
        ])->assertOk()->assertJsonPath('data.fuente', 'haversine');

        $obrero = Usuario::create([
            'name' => 'Obrero',
            'email' => 'obrero.geo@pillcomarca.pe',
            'password' => bcrypt('secret123'),
            'activo' => true,
        ]);
        $this->actingAsConRol($obrero, 'obrero_obra');

        $this->postJson('/api/v1/geo/ruta', [
            'origen' => ['lat' => -12.06, 'lng' => -75.21],
            'destino' => ['lat' => -12.07, 'lng' => -75.20],
        ])->assertForbidden();
    }
}
