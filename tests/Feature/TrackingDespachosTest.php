<?php

namespace Tests\Feature;

use App\Models\Almacen;
use App\Models\ConfirmacionRecepcionDestino;
use App\Models\Despacho;
use App\Models\DespachoPosicion;
use App\Models\Obra;
use App\Models\Programa;
use App\Models\Transferencia;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class TrackingDespachosTest extends TestCase
{
    use RefreshDatabase;

    private Despacho $despacho;

    private Transferencia $transferencia;

    protected function setUp(): void
    {
        parent::setUp();

        $usuario = Usuario::create([
            'name' => 'Almacenero',
            'email' => 'almacenero.tracking@pillcomarca.pe',
            'password' => bcrypt('secret123'),
            'activo' => true,
        ]);
        $this->actingAsConRol($usuario, 'jefe_logistica_compras');

        $programa = Programa::create([
            'codigo' => 'PRG-TRK',
            'nombre' => 'Programa Tracking',
            'estado' => 'activo',
        ]);
        $obra = Obra::create([
            'programa_id' => $programa->id,
            'codigo' => 'OBR-TRK',
            'nombre' => 'Obra Tracking',
            'estado' => 'ejecucion',
        ]);
        $origen = Almacen::create([
            'obra_id' => $obra->id,
            'codigo' => 'ALM-ORI',
            'nombre' => 'Almacén Origen',
            'radio_geocerca_m' => 150,
            'latitud' => -12.06,
            'longitud' => -75.21,
            'activo' => true,
        ]);
        $destino = Almacen::create([
            'obra_id' => $obra->id,
            'codigo' => 'ALM-DES',
            'nombre' => 'Almacén Destino',
            'radio_geocerca_m' => 150,
            'latitud' => -12.08,
            'longitud' => -75.20,
            'activo' => true,
        ]);

        $this->transferencia = Transferencia::create([
            'codigo' => 'TRF-TRK-001',
            'almacen_origen_id' => $origen->id,
            'almacen_destino_id' => $destino->id,
            'motivo' => 'redistribucion',
            'estado' => 'en_transito',
            'distancia_m' => 3200,
            'eta_min' => 25,
        ]);

        $this->despacho = Despacho::create([
            'transferencia_id' => $this->transferencia->id,
            'despachado_por' => $usuario->id,
            'despachado_en' => now()->subMinutes(5),
        ]);
    }

    public function test_registra_una_posicion(): void
    {
        $respuesta = $this->postJson(
            "/api/v1/despachos/{$this->despacho->id}/posiciones",
            [
                'lat' => -12.065,
                'lng' => -75.205,
                'precision_m' => 8,
                'velocidad_kmh' => 30,
                'uuid' => (string) Str::uuid(),
            ],
        );

        $respuesta->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data.aceptadas');

        $this->assertSame(1, DespachoPosicion::query()->count());
    }

    public function test_uuid_duplicado_es_idempotente(): void
    {
        $uuid = (string) Str::uuid();

        $this->postJson("/api/v1/despachos/{$this->despacho->id}/posiciones", [
            'lat' => -12.065,
            'lng' => -75.205,
            'uuid' => $uuid,
        ])->assertStatus(201);

        $this->postJson("/api/v1/despachos/{$this->despacho->id}/posiciones", [
            'lat' => -12.065,
            'lng' => -75.205,
            'uuid' => $uuid,
        ])->assertStatus(201)
            ->assertJsonPath('data.aceptadas.0.duplicado', true);

        $this->assertSame(1, DespachoPosicion::query()->count());
    }

    public function test_rechaza_posicion_antigua(): void
    {
        $respuesta = $this->postJson(
            "/api/v1/despachos/{$this->despacho->id}/posiciones",
            [
                'lat' => -12.065,
                'lng' => -75.205,
                'capturada_en' => now()->subMinutes(30)->toIso8601String(),
            ],
        );

        $respuesta->assertStatus(201)
            ->assertJsonCount(1, 'data.rechazadas');

        $this->assertSame(0, DespachoPosicion::query()->count());
    }

    public function test_rechaza_despacho_recepcionado(): void
    {
        $this->transferencia->update(['estado' => 'recibida']);

        ConfirmacionRecepcionDestino::create([
            'transferencia_id' => $this->transferencia->id,
            'almacenero_id' => $this->despacho->despachado_por,
            'recibida_en' => now(),
            'hay_diferencias' => false,
        ]);

        $this->postJson("/api/v1/despachos/{$this->despacho->id}/posiciones", [
            'lat' => -12.065,
            'lng' => -75.205,
        ])->assertStatus(409);
    }

    public function test_lote_mixto_reporta_rechazadas(): void
    {
        $respuesta = $this->postJson(
            "/api/v1/despachos/{$this->despacho->id}/posiciones",
            [
                'posiciones' => [
                    ['lat' => -12.065, 'lng' => -75.205],
                    ['lat' => -12.066, 'lng' => -75.206],
                    ['lat' => 200, 'lng' => -75.206],
                ],
            ],
        );

        $respuesta->assertStatus(201)
            ->assertJsonCount(2, 'data.aceptadas')
            ->assertJsonCount(1, 'data.rechazadas');
    }

    public function test_consulta_recorrido_y_ultima_posicion(): void
    {
        DespachoPosicion::create([
            'despacho_id' => $this->despacho->id,
            'latitud' => -12.065,
            'longitud' => -75.205,
            'uuid' => (string) Str::uuid(),
            'capturada_en' => now()->subMinutes(3),
            'recibida_en' => now()->subMinutes(3),
        ]);

        $this->getJson("/api/v1/despachos/{$this->despacho->id}/posiciones")
            ->assertOk()
            ->assertJsonPath('data.ultima_posicion.latitud', '-12.0650000')
            ->assertJsonStructure(['data' => ['posiciones', 'ultima_posicion', 'antiguedad_seg', 'distancia_recorrida_m']]);
    }

    public function test_purga_posiciones_vencidas(): void
    {
        DespachoPosicion::create([
            'despacho_id' => $this->despacho->id,
            'latitud' => -12.065,
            'longitud' => -75.205,
            'uuid' => (string) Str::uuid(),
            'capturada_en' => now()->subDays(40),
            'recibida_en' => now()->subDays(40),
        ]);

        $this->artisan('tracking:purgar')->assertSuccessful();

        $this->assertSame(0, DespachoPosicion::query()->count());
    }

    public function test_genera_alerta_por_perdida_de_senal(): void
    {
        DespachoPosicion::create([
            'despacho_id' => $this->despacho->id,
            'latitud' => -12.065,
            'longitud' => -75.205,
            'velocidad_kmh' => 30,
            'uuid' => (string) Str::uuid(),
            'capturada_en' => now()->subMinutes(15),
            'recibida_en' => now()->subMinutes(15),
        ]);

        $this->artisan('tracking:evaluar-alertas')->assertSuccessful();

        $this->assertDatabaseHas('alertas_geoespaciales', [
            'despacho_id' => $this->despacho->id,
            'tipo' => 'sin_senal_tracking',
        ]);
    }

    public function test_usuario_sin_permiso_no_envia_posiciones(): void
    {
        $obrero = Usuario::create([
            'name' => 'Obrero',
            'email' => 'obrero.tracking@pillcomarca.pe',
            'password' => bcrypt('secret123'),
            'activo' => true,
        ]);
        $this->actingAsConRol($obrero, 'obrero_obra');

        $this->postJson("/api/v1/despachos/{$this->despacho->id}/posiciones", [
            'lat' => -12.065,
            'lng' => -75.205,
        ])->assertForbidden();
    }
}
