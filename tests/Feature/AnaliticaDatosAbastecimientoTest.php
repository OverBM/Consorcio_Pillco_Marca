<?php

namespace Tests\Feature;

use App\Domain\Analitica\SeriesDemandaService;
use App\Models\Almacen;
use App\Models\Material;
use App\Models\MaterialProveedor;
use App\Models\Obra;
use App\Models\Programa;
use App\Models\Proveedor;
use App\Models\StockAlmacen;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AnaliticaDatosAbastecimientoTest extends TestCase
{
    use RefreshDatabase;

    private Usuario $usuario;

    private Material $material;

    private Proveedor $proveedor;

    private Almacen $almacen;

    protected function setUp(): void
    {
        parent::setUp();

        $this->usuario = Usuario::create([
            'name' => 'Jefe de Logística',
            'email' => 'logistica@pillcomarca.pe',
            'password' => bcrypt('secret123'),
            'activo' => true,
        ]);
        $this->actingAsConRol($this->usuario, 'jefe_logistica_compras');

        $programa = Programa::create([
            'codigo' => 'PRG-AN',
            'nombre' => 'Programa Analítica',
            'estado' => 'activo',
        ]);

        $obra = Obra::create([
            'programa_id' => $programa->id,
            'codigo' => 'OBR-AN',
            'nombre' => 'Obra Analítica',
            'estado' => 'ejecucion',
        ]);

        $this->almacen = Almacen::create([
            'obra_id' => $obra->id,
            'codigo' => 'ALM-AN',
            'nombre' => 'Almacén Analítica',
            'activo' => true,
        ]);

        $categoriaId = DB::table('categorias_material')->insertGetId([
            'nombre' => 'Acero',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $unidadId = DB::table('unidades_medida')->insertGetId([
            'codigo' => 'UND',
            'nombre' => 'Unidad',
        ]);

        $this->material = Material::create([
            'codigo' => 'MAT-AN-01',
            'nombre' => 'Acero corrugado',
            'categoria_id' => $categoriaId,
            'unidad_id' => $unidadId,
            'criticidad' => 'alta',
            'costo_referencial' => 12.5,
            'activo' => true,
        ]);

        $this->proveedor = Proveedor::create([
            'ruc' => '20123456789',
            'razon_social' => 'Aceros del Centro SA',
            'activo' => true,
        ]);
    }

    public function test_registra_parametros_de_abastecimiento(): void
    {
        $respuesta = $this->postJson(
            "/api/v1/abastecimiento/materiales/{$this->material->id}/proveedores",
            [
                'proveedor_id' => $this->proveedor->id,
                'lead_time_dias' => 9,
                'costo_pedido' => 50,
                'precio_unitario' => 10,
                'es_principal' => true,
            ],
        );

        $respuesta->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.lead_time_dias', '9.00');

        $this->assertDatabaseHas('material_proveedor', [
            'material_id' => $this->material->id,
            'proveedor_id' => $this->proveedor->id,
            'es_principal' => true,
        ]);
    }

    public function test_rechaza_parametros_duplicados(): void
    {
        MaterialProveedor::create([
            'material_id' => $this->material->id,
            'proveedor_id' => $this->proveedor->id,
            'lead_time_dias' => 7,
            'costo_pedido' => 40,
            'precio_unitario' => 10,
            'es_principal' => true,
        ]);

        $respuesta = $this->postJson(
            "/api/v1/abastecimiento/materiales/{$this->material->id}/proveedores",
            [
                'proveedor_id' => $this->proveedor->id,
                'lead_time_dias' => 9,
                'costo_pedido' => 50,
            ],
        );

        $respuesta->assertStatus(422);
    }

    public function test_solo_un_proveedor_principal_por_material(): void
    {
        $segundo = Proveedor::create([
            'ruc' => '20987654321',
            'razon_social' => 'Fierros del Sur SA',
            'activo' => true,
        ]);

        $this->postJson("/api/v1/abastecimiento/materiales/{$this->material->id}/proveedores", [
            'proveedor_id' => $this->proveedor->id,
            'lead_time_dias' => 9,
            'costo_pedido' => 50,
            'es_principal' => true,
        ])->assertStatus(201);

        $this->postJson("/api/v1/abastecimiento/materiales/{$this->material->id}/proveedores", [
            'proveedor_id' => $segundo->id,
            'lead_time_dias' => 4,
            'costo_pedido' => 30,
            'es_principal' => true,
        ])->assertStatus(201);

        $this->assertSame(
            1,
            MaterialProveedor::query()
                ->where('material_id', $this->material->id)
                ->where('es_principal', true)
                ->count(),
        );
    }

    public function test_series_incluyen_ceros_y_excluyen_ajustes(): void
    {
        DB::table('kardex')->insert([
            [
                'almacen_id' => $this->almacen->id,
                'material_id' => $this->material->id,
                'tipo_movimiento' => 'salida_consumo',
                'cantidad' => -10,
                'saldo_resultante' => 90,
                'created_at' => now(),
            ],
            [
                'almacen_id' => $this->almacen->id,
                'material_id' => $this->material->id,
                'tipo_movimiento' => 'ajuste_inventario_faltante',
                'cantidad' => -99,
                'saldo_resultante' => 1,
                'created_at' => now(),
            ],
            [
                'almacen_id' => $this->almacen->id,
                'material_id' => $this->material->id,
                'tipo_movimiento' => 'ingreso_recepcion',
                'cantidad' => 50,
                'saldo_resultante' => 140,
                'created_at' => now(),
            ],
            [
                'almacen_id' => $this->almacen->id,
                'material_id' => $this->material->id,
                'tipo_movimiento' => 'salida_despacho',
                'cantidad' => -5,
                'saldo_resultante' => 135,
                'created_at' => now(),
            ],
        ]);

        $serie = app(SeriesDemandaService::class)
            ->demandaDiaria($this->almacen->id, $this->material->id, 7);

        $this->assertCount(7, $serie);
        $this->assertSame(now()->toDateString(), $serie[6]['fecha']);
        $this->assertSame(15.0, $serie[6]['cantidad']);
        $this->assertSame(0.0, $serie[0]['cantidad']);
    }

    public function test_payload_marca_datos_insuficientes_y_usa_proveedor_principal(): void
    {
        StockAlmacen::create([
            'almacen_id' => $this->almacen->id,
            'material_id' => $this->material->id,
            'cantidad' => 100,
            'cantidad_reservada' => 10,
        ]);

        MaterialProveedor::create([
            'material_id' => $this->material->id,
            'proveedor_id' => $this->proveedor->id,
            'lead_time_dias' => 9,
            'costo_pedido' => 50,
            'precio_unitario' => 10,
            'es_principal' => true,
        ]);

        $payload = app(SeriesDemandaService::class)->payloadSeries(
            90,
            null,
            $this->almacen->id,
            $this->material->id,
        );

        $this->assertCount(1, $payload['series']);
        $this->assertSame(90.0, $payload['series'][0]['stock_actual']);
        $this->assertSame(9.0, $payload['series'][0]['lead_time_dias']);
        $this->assertTrue($payload['series'][0]['datos_insuficientes']);
    }

    public function test_usuario_sin_permiso_no_puede_editar(): void
    {
        $obrero = Usuario::create([
            'name' => 'Obrero',
            'email' => 'obrero@pillcomarca.pe',
            'password' => bcrypt('secret123'),
            'activo' => true,
        ]);
        $this->actingAsConRol($obrero, 'obrero_obra');

        $this->postJson("/api/v1/abastecimiento/materiales/{$this->material->id}/proveedores", [
            'proveedor_id' => $this->proveedor->id,
            'lead_time_dias' => 9,
            'costo_pedido' => 50,
        ])->assertForbidden();
    }
}
