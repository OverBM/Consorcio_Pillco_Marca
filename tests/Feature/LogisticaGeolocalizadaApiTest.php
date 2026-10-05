<?php

namespace Tests\Feature;

use App\Models\Almacen;
use App\Models\Material;
use App\Models\Obra;
use App\Models\Programa;
use App\Models\StockAlmacen;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class LogisticaGeolocalizadaApiTest extends TestCase
{
    use RefreshDatabase;

    protected Usuario $usuario;

    protected Obra $obra1;

    protected Obra $obra2;

    protected Almacen $almacen1;

    protected Almacen $almacen2;

    protected Material $material;

    protected function setUp(): void
    {
        parent::setUp();

        $this->usuario = Usuario::create([
            'name' => 'Logistico Prueba',
            'email' => 'logistica@pillcomarca.pe',
            'password' => bcrypt('secret123'),
            'activo' => true,
        ]);

        $programa = Programa::create([
            'codigo' => 'PRG-JUNIN',
            'nombre' => 'Programa Valle del Mantaro',
            'estado' => 'activo',
        ]);

        $this->obra1 = Obra::create([
            'programa_id' => $programa->id,
            'codigo' => 'OBR-HUANCAYO',
            'nombre' => 'Puente Huancayo',
            'estado' => 'ejecucion',
            'departamento' => 'Junin',
            'provincia' => 'Huancayo',
            'distrito' => 'El Tambo',
            'latitud' => -12.0651,
            'longitud' => -75.2049,
        ]);

        $this->obra2 = Obra::create([
            'programa_id' => $programa->id,
            'codigo' => 'OBR-CONCEPCION',
            'nombre' => 'Vial Concepcion',
            'estado' => 'ejecucion',
            'departamento' => 'Junin',
            'provincia' => 'Concepcion',
            'distrito' => 'Concepcion',
            'latitud' => -11.9189,
            'longitud' => -75.3134,
        ]);

        $this->almacen1 = Almacen::create([
            'obra_id' => $this->obra1->id,
            'codigo' => 'ALM-HYO',
            'nombre' => 'Almacén El Tambo',
            'tipo' => 'principal',
            'latitud' => -12.0651,
            'longitud' => -75.2049,
            'activo' => true,
        ]);

        $this->almacen2 = Almacen::create([
            'obra_id' => $this->obra2->id,
            'codigo' => 'ALM-CONC',
            'nombre' => 'Almacén Concepción',
            'tipo' => 'principal',
            'latitud' => -11.9189,
            'longitud' => -75.3134,
            'activo' => true,
        ]);

        $catId = DB::table('categorias_material')->insertGetId([
            'nombre' => 'Cemento y Agregados',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $unId = DB::table('unidades_medida')->insertGetId([
            'codigo' => 'BLS',
            'nombre' => 'Bolsa 42.5kg',
        ]);

        $this->material = Material::create([
            'codigo' => 'MAT-CEM-AND',
            'nombre' => 'Cemento Andino Tipo I',
            'categoria_id' => $catId,
            'unidad_id' => $unId,
            'criticidad' => 'alta',
            'activo' => true,
        ]);
    }

    public function test_busqueda_multialmacen_retorna_candidatos_con_distancia_y_ranking(): void
    {
        // Proveer stock en Almacén Concepción
        StockAlmacen::create([
            'almacen_id' => $this->almacen2->id,
            'material_id' => $this->material->id,
            'cantidad' => 500,
            'cantidad_reservada' => 0,
        ]);

        $payload = [
            'material_id' => $this->material->id,
            'almacen_solicitante_id' => $this->almacen1->id,
            'cantidad_requerida' => 100,
            'radio_km' => 50,
        ];

        $response = $this->postJson('/api/v1/busqueda-multialmacen/buscar', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('total_candidatos', 1)
            ->assertJsonPath('candidatos.0.almacen_id', $this->almacen2->id);
    }

    public function test_flujo_completo_transferencia_inter_almacen(): void
    {
        // 1. Inicializar stock en Almacén 2 (origen)
        StockAlmacen::create([
            'almacen_id' => $this->almacen2->id,
            'material_id' => $this->material->id,
            'cantidad' => 300,
            'cantidad_reservada' => 0,
        ]);

        // 2. Solicitar transferencia de Almacén 2 -> Almacén 1
        $storeResp = $this->postJson('/api/v1/transferencias', [
            'almacen_origen_id' => $this->almacen2->id,
            'almacen_destino_id' => $this->almacen1->id,
            'motivo' => 'Rebalanceo stock',
            'detalles' => [
                [
                    'material_id' => $this->material->id,
                    'cantidad_solicitada' => 50,
                ],
            ],
        ]);

        $storeResp->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.estado', 'solicitada');

        $transfId = $storeResp->json('data.id');
        $detalleId = $storeResp->json('data.detalles.0.id');

        // 3. Aprobar transferencia (debe reservar stock en Almacén 2)
        $aprobResp = $this->postJson("/api/v1/transferencias/{$transfId}/aprobar");
        $aprobResp->assertStatus(200)
            ->assertJsonPath('data.estado', 'aprobada');

        $stockOrigen = StockAlmacen::where('almacen_id', $this->almacen2->id)
            ->where('material_id', $this->material->id)
            ->first();
        $this->assertEquals(50, (float) $stockOrigen->cantidad_reservada);

        // 4. Despachar transferencia (egresa stock físico y libera reserva)
        $despResp = $this->postJson('/api/v1/despachos', [
            'transferencia_id' => $transfId,
            'detalles' => [
                [
                    'id' => $detalleId,
                    'cantidad_despachada' => 50,
                ],
            ],
        ]);
        $despResp->assertStatus(201);

        $stockOrigen->refresh();
        $this->assertEquals(250, (float) $stockOrigen->cantidad);
        $this->assertEquals(0, (float) $stockOrigen->cantidad_reservada);

        // 5. Confirmar recepción en Almacén 1 (ingresa stock a destino)
        $recResp = $this->postJson("/api/v1/transferencias/{$transfId}/confirmar-recepcion", [
            'detalles' => [
                [
                    'id' => $detalleId,
                    'cantidad_recibida' => 50,
                ],
            ],
        ]);
        $recResp->assertStatus(200)
            ->assertJsonPath('data.estado', 'completada');

        $stockDestino = StockAlmacen::where('almacen_id', $this->almacen1->id)
            ->where('material_id', $this->material->id)
            ->first();
        $this->assertNotNull($stockDestino);
        $this->assertEquals(50, (float) $stockDestino->cantidad);
    }

    public function test_registrar_merma_con_egreso_de_stock(): void
    {
        StockAlmacen::create([
            'almacen_id' => $this->almacen1->id,
            'material_id' => $this->material->id,
            'cantidad' => 100,
            'cantidad_reservada' => 0,
        ]);

        $payload = [
            'almacen_id' => $this->almacen1->id,
            'material_id' => $this->material->id,
            'cantidad' => 5,
            'causa' => 'rotura_sacos',
            'justificacion' => 'Bolsas rotas por lluvia durante descarga',
        ];

        $response = $this->postJson('/api/v1/mermas', $payload);
        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $stock = StockAlmacen::where('almacen_id', $this->almacen1->id)
            ->where('material_id', $this->material->id)
            ->first();
        $this->assertEquals(95, (float) $stock->cantidad);
    }

    public function test_programar_inventario_fisico_y_ajustar_diferencias(): void
    {
        StockAlmacen::create([
            'almacen_id' => $this->almacen1->id,
            'material_id' => $this->material->id,
            'cantidad' => 100,
            'cantidad_reservada' => 0,
        ]);

        // Programar inventario a ciegas
        $invResp = $this->postJson('/api/v1/inventario-fisico', [
            'almacen_id' => $this->almacen1->id,
            'periodo' => '2026-OCT',
        ]);
        $invResp->assertStatus(201)
            ->assertJsonPath('success', true);

        $invId = $invResp->json('data.id');
        $detId = $invResp->json('data.detalles.0.id');

        // Registrar conteo físico con faltante de 2 unidades (se contaron 98)
        $ajusteResp = $this->postJson("/api/v1/inventario-fisico/{$invId}/conteos", [
            'conteos' => [
                [
                    'id' => $detId,
                    'cantidad_contada' => 98,
                    'justificacion' => 'Conteo físico validado por auditoría',
                ],
            ],
        ]);

        $ajusteResp->assertStatus(200)
            ->assertJsonPath('success', true);

        $stock = StockAlmacen::where('almacen_id', $this->almacen1->id)
            ->where('material_id', $this->material->id)
            ->first();
        $this->assertEquals(98, (float) $stock->cantidad);
    }
}
