<?php

namespace Tests\Feature;

use App\Models\AlertaAbastecimiento;
use App\Models\Almacen;
use App\Models\EjecucionAnalitica;
use App\Models\Material;
use App\Models\Obra;
use App\Models\ParametroInventario;
use App\Models\Programa;
use App\Models\PronosticoDemanda;
use App\Models\Proveedor;
use App\Models\StockAlmacen;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AnaliticaPipelineTest extends TestCase
{
    use RefreshDatabase;

    private Almacen $almacen;

    private Material $material;

    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();

        $programa = Programa::create([
            'codigo' => 'PRG-PIPE',
            'nombre' => 'Programa Pipeline',
            'estado' => 'activo',
        ]);
        $obra = Obra::create([
            'programa_id' => $programa->id,
            'codigo' => 'OBR-PIPE',
            'nombre' => 'Obra Pipeline',
            'estado' => 'ejecucion',
        ]);
        $this->almacen = Almacen::create([
            'obra_id' => $obra->id,
            'codigo' => 'ALM-PIPE',
            'nombre' => 'Almacén Pipeline',
            'activo' => true,
        ]);

        $categoriaId = DB::table('categorias_material')->insertGetId([
            'nombre' => 'Cemento',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $unidadId = DB::table('unidades_medida')->insertGetId([
            'codigo' => 'BLS',
            'nombre' => 'Bolsa',
        ]);

        $this->material = Material::create([
            'codigo' => 'MAT-PIPE',
            'nombre' => 'Cemento Portland',
            'categoria_id' => $categoriaId,
            'unidad_id' => $unidadId,
            'criticidad' => 'alta',
            'costo_referencial' => 25,
            'activo' => true,
        ]);

        $proveedor = Proveedor::create([
            'ruc' => '20444444444',
            'razon_social' => 'Cementos Andinos SA',
            'activo' => true,
        ]);

        StockAlmacen::create([
            'almacen_id' => $this->almacen->id,
            'material_id' => $this->material->id,
            'cantidad' => 100,
            'cantidad_reservada' => 0,
        ]);

        DB::table('material_proveedor')->insert([
            'material_id' => $this->material->id,
            'proveedor_id' => $proveedor->id,
            'lead_time_dias' => 9,
            'costo_pedido' => 50,
            'precio_unitario' => 25,
            'es_principal' => true,
            'activo' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_pipeline_persiste_resultados_y_es_idempotente(): void
    {
        Http::fake(['*/v1/pipeline' => Http::response($this->respuestaMotor(), 200)]);

        $this->artisan('analitica:ejecutar')->assertSuccessful();

        Http::assertSent(function ($request): bool {
            $datos = $request->data();

            return ! array_key_exists('generado_en', $datos)
                && ! array_key_exists('dias_historia', $datos['series'][0] ?? [])
                && ! array_key_exists('datos_insuficientes', $datos['series'][0] ?? []);
        });

        $this->assertSame(1, ParametroInventario::query()->count());
        $this->assertSame(2, PronosticoDemanda::query()->count());
        $this->assertSame(1, AlertaAbastecimiento::query()->count());
        $this->assertSame(1, EjecucionAnalitica::query()->where('estado', 'completada')->count());

        $this->artisan('analitica:ejecutar')->assertSuccessful();

        $this->assertSame(1, ParametroInventario::query()->count());
        $this->assertSame(2, PronosticoDemanda::query()->count());
        $this->assertSame(1, AlertaAbastecimiento::query()->count());
        $this->assertSame(2, EjecucionAnalitica::query()->count());
    }

    public function test_pipeline_falla_de_forma_controlada_si_el_motor_no_responde(): void
    {
        Http::fake(['*/v1/pipeline' => Http::response([], 500)]);

        $this->artisan('analitica:ejecutar')->assertFailed();

        $this->assertSame(0, ParametroInventario::query()->count());
        $this->assertSame(
            1,
            EjecucionAnalitica::query()->where('estado', 'fallida')->count(),
        );
    }

    public function test_api_respeta_permisos_y_devuelve_resumen(): void
    {
        Http::fake(['*/v1/pipeline' => Http::response($this->respuestaMotor(), 200)]);
        $this->artisan('analitica:ejecutar')->assertSuccessful();

        $jefe = Usuario::create([
            'name' => 'Jefe Logística',
            'email' => 'jefe.pipeline@pillcomarca.pe',
            'password' => bcrypt('secret123'),
            'activo' => true,
        ]);
        $this->actingAsConRol($jefe, 'jefe_logistica_compras');

        $this->getJson('/api/v1/analitica/parametros')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('meta.total', 1);

        $this->getJson('/api/v1/analitica/resumen')
            ->assertOk()
            ->assertJsonPath('data.parametros_vigentes', 1)
            ->assertJsonPath('data.alertas_criticas', 1)
            ->assertJsonStructure(['data' => ['cuota_ruteo' => ['usadas', 'limite', 'porcentaje']]]);

        $alertaId = AlertaAbastecimiento::query()->value('id');

        $this->postJson("/api/v1/analitica/alertas/{$alertaId}/reconocer")
            ->assertOk()
            ->assertJsonPath('data.estado', 'reconocida');
    }

    public function test_usuario_sin_permiso_no_consulta_analitica(): void
    {
        $obrero = Usuario::create([
            'name' => 'Obrero',
            'email' => 'obrero.pipeline@pillcomarca.pe',
            'password' => bcrypt('secret123'),
            'activo' => true,
        ]);
        $this->actingAsConRol($obrero, 'obrero_obra');

        $this->getJson('/api/v1/analitica/parametros')->assertForbidden();
    }

    /**
     * @return array<string, mixed>
     */
    private function respuestaMotor(): array
    {
        $manana = now()->addDay()->toDateString();
        $pasado = now()->addDays(2)->toDateString();

        return [
            'parametros' => [[
                'almacen_id' => $this->almacen->id,
                'material_id' => $this->material->id,
                'unidad' => 'BLS',
                'clase_abc' => 'A',
                'clase_xyz' => 'X',
                'clase_combinada' => 'AX',
                'coeficiente_variacion' => 0.12,
                'demanda_media_diaria' => 20,
                'demanda_anual' => 7300,
                'eoq' => 100,
                'costo_total_relevante' => 1000,
                'stock_seguridad' => 24.675,
                'punto_reorden' => 204.675,
                'lead_time_dias' => 9,
                'nivel_servicio' => 0.975,
                'estado' => 'calculado',
                'modelo_version' => 'deterministic-1.0',
            ]],
            'pronosticos' => [[
                'almacen_id' => $this->almacen->id,
                'material_id' => $this->material->id,
                'fechas' => [$manana, $pasado],
                'valores' => [20, 21],
                'limite_inferior' => [15, 16],
                'limite_superior' => [25, 26],
                'mape' => 10.5,
                'rmse' => 2.0,
                'metodo_usado' => 'holt_winters_estacional',
                'baja_confianza' => false,
                'modelo_version' => 'deterministic-1.0',
            ]],
            'alertas' => [[
                'almacen_id' => $this->almacen->id,
                'material_id' => $this->material->id,
                'tipo' => 'quiebre_proyectado',
                'severidad' => 'critica',
                'fecha_estimada' => now()->addDays(3)->toDateString(),
                'cantidad_sugerida' => 50,
                'detalle' => 'Quiebre estimado en 3 días con la demanda pronosticada.',
                'clave_idempotente' => 'quiebre_proyectado:1:1:'.now()->addDays(3)->toDateString(),
            ]],
            'resumen' => ['series' => 1],
            'modelo_version' => 'deterministic-1.0',
        ];
    }
}
