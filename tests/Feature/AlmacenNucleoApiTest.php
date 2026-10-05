<?php

namespace Tests\Feature;

use App\Models\Almacen;
use App\Models\Material;
use App\Models\Obra;
use App\Models\OrdenCompra;
use App\Models\Programa;
use App\Models\Proveedor;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AlmacenNucleoApiTest extends TestCase
{
    use RefreshDatabase;

    protected Usuario $usuario;

    protected Obra $obra;

    protected Almacen $almacen;

    protected Material $material;

    protected OrdenCompra $ordenCompra;

    protected function setUp(): void
    {
        parent::setUp();

        $this->usuario = Usuario::create([
            'name' => 'Juan Perez',
            'email' => 'juan.perez@pillcomarca.pe',
            'password' => bcrypt('secret123'),
            'activo' => true,
        ]);

        $programa = Programa::create([
            'codigo' => 'PRG-MANTARO',
            'nombre' => 'Programa Vial y Salud Mantaro',
            'estado' => 'activo',
        ]);

        $this->obra = Obra::create([
            'programa_id' => $programa->id,
            'codigo' => 'OBR-01',
            'nombre' => 'Mejoramiento Vial Chupaca',
            'estado' => 'ejecucion',
            'departamento' => 'Junin',
            'provincia' => 'Chupaca',
            'distrito' => 'Chupaca',
        ]);

        $this->almacen = Almacen::create([
            'obra_id' => $this->obra->id,
            'codigo' => 'ALM-01',
            'nombre' => 'Almacén Central Chupaca',
            'tipo' => 'principal',
            'activo' => true,
        ]);

        $categoriaId = DB::table('categorias_material')->insertGetId([
            'nombre' => 'Materiales de Construcción',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $unidadId = DB::table('unidades_medida')->insertGetId([
            'codigo' => 'BOL',
            'nombre' => 'Bolsa',
        ]);

        $this->material = Material::create([
            'codigo' => 'MAT-CEM-01',
            'nombre' => 'Cemento Portland Tipo I',
            'categoria_id' => $categoriaId,
            'unidad_id' => $unidadId,
            'criticidad' => 'alta',
            'activo' => true,
        ]);

        $proveedor = Proveedor::create([
            'ruc' => '20123456789',
            'razon_social' => 'Cementos Pacasmayo SAA',
            'estado_homologacion' => 'aprobado',
            'activo' => true,
        ]);

        $this->ordenCompra = OrdenCompra::create([
            'codigo' => 'OC-2026-001',
            'proveedor_id' => $proveedor->id,
            'obra_id' => $this->obra->id,
            'almacen_destino_id' => $this->almacen->id,
            'estado' => 'emitida',
            'total' => 15000.00,
            'emitida_por' => $this->usuario->id,
        ]);

        DB::table('orden_compra_detalles')->insert([
            'id' => 1,
            'orden_compra_id' => $this->ordenCompra->id,
            'material_id' => $this->material->id,
            'cantidad' => 100,
            'precio_unitario' => 150.00,
            'especificaciones_tecnicas' => json_encode([]),
        ]);
    }

    public function test_consultar_stock_y_stock_critico(): void
    {
        $response = $this->getJson('/api/v1/stock');
        $response->assertStatus(200)
            ->assertJsonStructure(['success', 'data', 'meta']);

        $respCritico = $this->getJson('/api/v1/stock/critico');
        $respCritico->assertStatus(200)
            ->assertJsonStructure(['success', 'data', 'total_criticos']);
    }

    public function test_registrar_recepcion_e_pod_y_actualizar_stock(): void
    {
        $payload = [
            'almacen_id' => $this->almacen->id,
            'orden_compra_id' => $this->ordenCompra->id,
            'guia_remision' => 'GR-001-9982',
            'observaciones' => 'Recepción conforme en almacén de obra',
            'detalles' => [
                [
                    'orden_compra_detalle_id' => 1,
                    'material_id' => $this->material->id,
                    'cantidad_ordenada' => 100,
                    'cantidad_recibida' => 100,
                    'cumple_especificaciones' => true,
                ],
            ],
        ];

        $response = $this->postJson('/api/v1/recepciones', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.estado', 'conforme');

        // Validar que el stock se incrementó en la base de datos
        $this->assertDatabaseHas('stock_almacen', [
            'almacen_id' => $this->almacen->id,
            'material_id' => $this->material->id,
            'cantidad' => 100,
        ]);

        // Validar que se asentó el movimiento en el Kardex
        $this->assertDatabaseHas('kardex', [
            'almacen_id' => $this->almacen->id,
            'material_id' => $this->material->id,
            'tipo_movimiento' => 'ingreso_recepcion',
            'cantidad' => 100,
            'saldo_resultante' => 100,
        ]);
    }

    public function test_registrar_solicitud_material_y_despachar(): void
    {
        // 1. Ingresar stock previo
        $this->postJson('/api/v1/recepciones', [
            'almacen_id' => $this->almacen->id,
            'orden_compra_id' => $this->ordenCompra->id,
            'detalles' => [
                [
                    'orden_compra_detalle_id' => 1,
                    'material_id' => $this->material->id,
                    'cantidad_ordenada' => 50,
                    'cantidad_recibida' => 50,
                ],
            ],
        ]);

        // 2. Registrar solicitud
        $solPayload = [
            'obra_id' => $this->obra->id,
            'almacen_id' => $this->almacen->id,
            'urgente' => false,
            'detalles' => [
                [
                    'material_id' => $this->material->id,
                    'cantidad' => 20,
                ],
            ],
        ];

        $solResp = $this->postJson('/api/v1/solicitudes', $solPayload);
        $solResp->assertStatus(201);
        $solicitudId = $solResp->json('data.id');

        // 3. Atender / Despachar
        $atenderResp = $this->postJson("/api/v1/solicitudes/{$solicitudId}/atender");
        $atenderResp->assertStatus(200)
            ->assertJsonPath('data.estado', 'atendida');

        // Verificar que el stock disminuyó a 30
        $this->assertDatabaseHas('stock_almacen', [
            'almacen_id' => $this->almacen->id,
            'material_id' => $this->material->id,
            'cantidad' => 30,
        ]);
    }
}
