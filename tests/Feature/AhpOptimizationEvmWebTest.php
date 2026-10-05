<?php

namespace Tests\Feature;

use App\Domain\Optimization\AhpOptimizationService;
use App\Domain\Project\EvmProjectService;
use App\Models\Almacen;
use App\Models\Material;
use App\Models\Obra;
use App\Models\ParametroSistema;
use App\Models\Partida;
use App\Models\Programa;
use App\Models\StockAlmacen;
use App\Models\Usuario;
use App\Models\Valorizacion;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AhpOptimizationEvmWebTest extends TestCase
{
    use RefreshDatabase;

    protected Programa $programa;

    protected Obra $obra1;

    protected Obra $obra2;

    protected Almacen $almacen1;

    protected Almacen $almacen2;

    protected Material $material;

    protected function setUp(): void
    {
        parent::setUp();

        $this->programa = Programa::create([
            'codigo' => 'PRG-MANTARO',
            'nombre' => 'Programa Valle del Mantaro',
            'estado' => 'activo',
            'presupuesto_total' => 5000000.00,
        ]);

        $this->obra1 = Obra::create([
            'programa_id' => $this->programa->id,
            'codigo' => 'OBR-HYO-01',
            'nombre' => 'Puente Comuneros Huancayo',
            'estado' => 'ejecucion',
            'departamento' => 'Junin',
            'provincia' => 'Huancayo',
            'distrito' => 'Huancayo',
            'latitud' => -12.0651,
            'longitud' => -75.2049,
            'presupuesto_base' => 2000000.00,
        ]);

        $this->obra2 = Obra::create([
            'programa_id' => $this->programa->id,
            'codigo' => 'OBR-CONC-02',
            'nombre' => 'I.E. Los Andes Concepcion',
            'estado' => 'ejecucion',
            'departamento' => 'Junin',
            'provincia' => 'Concepcion',
            'distrito' => 'Concepcion',
            'latitud' => -11.9189,
            'longitud' => -75.3134,
            'presupuesto_base' => 1500000.00,
        ]);

        $this->almacen1 = Almacen::create([
            'obra_id' => $this->obra1->id,
            'codigo' => 'ALM-HYO-01',
            'nombre' => 'Almacen Huancayo',
            'tipo' => 'principal',
            'latitud' => -12.0651,
            'longitud' => -75.2049,
            'activo' => true,
        ]);

        $this->almacen2 = Almacen::create([
            'obra_id' => $this->obra2->id,
            'codigo' => 'ALM-CONC-02',
            'nombre' => 'Almacen Concepcion',
            'tipo' => 'obra',
            'latitud' => -11.9189,
            'longitud' => -75.3134,
            'activo' => true,
        ]);

        $categoriaId = DB::table('categorias_material')->insertGetId([
            'nombre' => 'Materiales Estructurales',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $unidadId = DB::table('unidades_medida')->insertGetId([
            'codigo' => 'VAR',
            'nombre' => 'Varilla',
        ]);

        $this->material = Material::create([
            'codigo' => 'MAT-ACERO-12',
            'nombre' => 'Acero Corrugado 1/2" Grado 60',
            'categoria_id' => $categoriaId,
            'unidad_id' => $unidadId,
            'costo_unitario' => 45.00,
            'peso_unitario_kg' => 8.88,
            'criticidad' => 'alta',
            'es_critico' => true,
            'activo' => true,
        ]);

        StockAlmacen::create([
            'almacen_id' => $this->almacen2->id,
            'material_id' => $this->material->id,
            'cantidad' => 200,
            'cantidad_reservada' => 20,
            'stock_minimo' => 50,
            'stock_maximo' => 500,
        ]);
    }

    public function test_motor_ahp_calcula_ranking_multicriterio_correctamente(): void
    {
        $ahpService = app(AhpOptimizationService::class);

        $transferencias = $ahpService->calcularRankingTransferencias(
            $this->obra1,
            $this->material,
            100.0
        );

        $this->assertIsArray($transferencias);
        $this->assertNotEmpty($transferencias);

        $primera = $transferencias[0];
        $this->assertEquals((string) $this->almacen2->id, $primera['almacenOrigenId']);
        $this->assertGreaterThan(0, $primera['distanciaKm']);
        $this->assertGreaterThan(0, $primera['puntajeAhp']);
        $this->assertContains($primera['prioridad'], ['alta', 'media', 'baja']);
    }

    public function test_motor_evm_calcula_metricas_valor_ganado_y_consolidado_pmu(): void
    {
        // Crear partidas y valorización para obra1
        Partida::create([
            'obra_id' => $this->obra1->id,
            'codigo' => '01.01',
            'descripcion' => 'Movimiento de Tierras',
            'unidad' => 'M3',
            'metrado' => 1000,
            'costo_unitario' => 50.00,
        ]);

        Valorizacion::create([
            'obra_id' => $this->obra1->id,
            'periodo' => '2026-09-01',
            'valor_planificado' => 40000.00,
            'valor_ganado' => 45000.00,
            'costo_real' => 43000.00,
            'estado' => 'aprobada',
        ]);

        $evmService = app(EvmProjectService::class);
        $metricasObra = $evmService->calcularEvmObra($this->obra1);

        $this->assertEquals(2000000.00, $metricasObra['bac']);
        $this->assertEquals(40000.00, $metricasObra['pv']);
        $this->assertEquals(45000.00, $metricasObra['ev']);
        $this->assertEquals(43000.00, $metricasObra['ac']);
        $this->assertEquals(2000.00, $metricasObra['cv']);
        $this->assertEquals(5000.00, $metricasObra['sv']);
        $this->assertGreaterThan(1.0, $metricasObra['cpi']);
        $this->assertGreaterThan(1.0, $metricasObra['spi']);

        $consolidado = $evmService->calcularConsolidadoPrograma();
        $this->assertGreaterThanOrEqual(1, $consolidado['totalObras']);
        $this->assertEquals(3500000.00, $consolidado['totalBac']);
    }

    public function test_rutas_web_requieren_autenticacion_y_renderizan_con_usuario(): void
    {
        // 1. Invitados son redirigidos a /login
        $responseGuest = $this->get('/panel');
        $responseGuest->assertRedirect('/login');

        $responseLogin = $this->get('/login');
        $responseLogin->assertStatus(200);

        // 2. Crear usuario autenticado
        $user = Usuario::create([
            'name' => 'Residente Test',
            'email' => 'test.residente@pillcomarca.pe',
            'password' => Hash::make('password123'),
            'activo' => true,
        ]);

        $this->actingAs($user);

        $responsePanel = $this->get('/panel');
        $responsePanel->assertStatus(200);

        $responsePrograma = $this->get('/programa');
        $responsePrograma->assertStatus(200);

        $responseRedistribucion = $this->get('/programa/redistribucion');
        $responseRedistribucion->assertStatus(200);

        $responseStock = $this->get('/stock');
        $responseStock->assertStatus(200);

        $responseUsuarios = $this->get('/admin/usuarios');
        $responseUsuarios->assertStatus(200);

        $responseAuditoria = $this->get('/admin/auditoria');
        $responseAuditoria->assertStatus(200);

        $responseParametros = $this->get('/admin/parametros');
        $responseParametros->assertStatus(200);
    }

    public function test_autenticacion_web_y_actualizacion_parametros(): void
    {
        $user = Usuario::create([
            'name' => 'Admin Test',
            'email' => 'admin@pillcomarca.pe',
            'password' => Hash::make('password123'),
            'activo' => true,
        ]);

        // Intento con credenciales erróneas
        $responseBadLogin = $this->post('/login', [
            'email' => 'admin@pillcomarca.pe',
            'password' => 'wrongpassword',
        ]);
        $responseBadLogin->assertSessionHasErrors('email');

        // Intento con credenciales correctas
        $responseLoginPost = $this->post('/login', [
            'email' => 'admin@pillcomarca.pe',
            'password' => 'password123',
        ]);
        $responseLoginPost->assertRedirect('/panel');
        $this->assertAuthenticatedAs($user);

        $responseParametros = $this->post('/admin/parametros', [
            'ahp_peso_distancia' => 0.45,
            'ahp_peso_stock' => 0.35,
            'ahp_peso_criticidad' => 0.20,
            'factor_sinuosidad_vial' => 1.40,
        ]);
        $responseParametros->assertRedirect();

        $this->assertEquals(0.45, ParametroSistema::getValor('ahp_peso_distancia'));
        $this->assertEquals(1.40, ParametroSistema::getValor('factor_sinuosidad_vial'));
    }
}
