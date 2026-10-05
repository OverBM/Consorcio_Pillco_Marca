<?php

namespace Tests\Feature;

use App\Models\Almacen;
use App\Models\Material;
use App\Models\Obra;
use App\Models\Programa;
use App\Models\Proveedor;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ComprasProveedoresApiTest extends TestCase
{
    use RefreshDatabase;

    protected Usuario $usuario;

    protected Obra $obra;

    protected Almacen $almacen;

    protected Material $material;

    protected Proveedor $proveedor;

    protected function setUp(): void
    {
        parent::setUp();

        $this->usuario = Usuario::create([
            'name' => 'Residente Prueba',
            'email' => 'residente@pillcomarca.pe',
            'password' => bcrypt('secret123'),
            'activo' => true,
        ]);

        $programa = Programa::create([
            'codigo' => 'PRG-01',
            'nombre' => 'Programa Junin Central',
            'estado' => 'activo',
        ]);

        $this->obra = Obra::create([
            'programa_id' => $programa->id,
            'codigo' => 'OBR-SICAYA',
            'nombre' => 'Vial Chupaca - Sicaya',
            'estado' => 'ejecucion',
            'departamento' => 'Junin',
            'provincia' => 'Chupaca',
            'distrito' => 'Sicaya',
        ]);

        $this->almacen = Almacen::create([
            'obra_id' => $this->obra->id,
            'codigo' => 'ALM-SICAYA',
            'nombre' => 'Almacén Sicaya',
            'tipo' => 'principal',
            'activo' => true,
        ]);

        $catId = DB::table('categorias_material')->insertGetId([
            'nombre' => 'Fierros y Aceros',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $unId = DB::table('unidades_medida')->insertGetId([
            'codigo' => 'VAR',
            'nombre' => 'Varilla',
        ]);

        $this->material = Material::create([
            'codigo' => 'MAT-ACERO-12',
            'nombre' => 'Acero Corrugado 1/2 pulgada',
            'categoria_id' => $catId,
            'unidad_id' => $unId,
            'criticidad' => 'alta',
            'activo' => true,
        ]);

        $this->proveedor = Proveedor::create([
            'ruc' => '20456789012',
            'razon_social' => 'Aceros Arequipa SA',
            'contacto' => 'Carlos V',
            'telefono' => '964123456',
            'email' => 'ventas@acerosarequipa.pe',
            'activo' => true,
        ]);
    }

    public function test_crear_y_aprobar_requerimiento_de_compra(): void
    {
        $payload = [
            'obra_id' => $this->obra->id,
            'almacen_id' => $this->almacen->id,
            'justificacion' => 'Requerimiento de acero para zapatas del tramo 2',
            'detalles' => [
                [
                    'material_id' => $this->material->id,
                    'cantidad' => 250,
                ],
            ],
        ];

        $response = $this->postJson('/api/v1/requerimientos', $payload);
        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.estado', 'solicitado');

        $reqId = $response->json('data.id');

        // Evaluar / Aprobar por Jefatura de Logística
        $evalResp = $this->postJson("/api/v1/requerimientos/{$reqId}/evaluar", [
            'estado' => 'aprobado',
        ]);

        $evalResp->assertStatus(200)
            ->assertJsonPath('data.estado', 'aprobado');
    }

    public function test_registrar_cotizaciones_y_seleccionar_ganador(): void
    {
        // 1. Crear requerimiento
        $reqResp = $this->postJson('/api/v1/requerimientos', [
            'obra_id' => $this->obra->id,
            'almacen_id' => $this->almacen->id,
            'justificacion' => 'Acero para columnas',
            'detalles' => [
                ['material_id' => $this->material->id, 'cantidad' => 100],
            ],
        ]);
        $reqId = $reqResp->json('data.id');

        // 2. Registrar 2 cotizaciones
        $cot1 = $this->postJson('/api/v1/cotizaciones', [
            'requerimiento_id' => $reqId,
            'proveedor_id' => $this->proveedor->id,
            'plazo_entrega_dias' => 3,
            'detalles' => [
                ['material_id' => $this->material->id, 'cantidad' => 100, 'precio_unitario' => 45.50],
            ],
        ]);
        $cot1->assertStatus(201);
        $cot1Id = $cot1->json('data.id');

        // 3. Seleccionar cotización ganadora
        $selResp = $this->postJson("/api/v1/cotizaciones/{$cot1Id}/seleccionar", [
            'motivo_seleccion' => 'Menor plazo de entrega y precio más competitivo',
        ]);

        $selResp->assertStatus(200)
            ->assertJsonPath('data.estado', 'seleccionada');
    }

    public function test_emitir_orden_de_compra(): void
    {
        $ocPayload = [
            'proveedor_id' => $this->proveedor->id,
            'obra_id' => $this->obra->id,
            'almacen_destino_id' => $this->almacen->id,
            'urgente' => false,
            'detalles' => [
                [
                    'material_id' => $this->material->id,
                    'cantidad' => 50,
                    'precio_unitario' => 48.00,
                ],
            ],
        ];

        $response = $this->postJson('/api/v1/ordenes-compra', $ocPayload);
        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total', '2400.00');
    }
}
