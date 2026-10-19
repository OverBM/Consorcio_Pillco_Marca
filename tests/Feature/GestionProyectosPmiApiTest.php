<?php

namespace Tests\Feature;

use App\Models\Almacen;
use App\Models\LineaBaseCosto;
use App\Models\Material;
use App\Models\Obra;
use App\Models\Partida;
use App\Models\Programa;
use App\Models\StockAlmacen;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class GestionProyectosPmiApiTest extends TestCase
{
    use RefreshDatabase;

    protected Usuario $usuario;

    protected Obra $obra;

    protected Partida $partida;

    protected Almacen $almacen;

    protected Material $material;

    protected function setUp(): void
    {
        parent::setUp();

        $this->usuario = Usuario::create([
            'name' => 'Director Proyecto PMI',
            'email' => 'pmi@pillcomarca.pe',
            'password' => bcrypt('secret123'),
            'activo' => true,
        ]);

        $this->actingAsConRol($this->usuario);

        $programa = Programa::create([
            'codigo' => 'PRG-PMI-01',
            'nombre' => 'Programa Infraestructura Vial Junín',
            'estado' => 'activo',
        ]);

        $this->obra = Obra::create([
            'programa_id' => $programa->id,
            'codigo' => 'OBR-HUANCAYO-01',
            'nombre' => 'Mejoramiento Carretera El Tambo - Sicaya',
            'estado' => 'ejecucion',
            'departamento' => 'Junin',
            'provincia' => 'Huancayo',
            'distrito' => 'El Tambo',
            'latitud' => -12.0651,
            'longitud' => -75.2049,
        ]);

        LineaBaseCosto::create([
            'obra_id' => $this->obra->id,
            'version' => 1,
            'bac' => 1000000.00,
            'vigente' => true,
            'aprobada_por' => $this->usuario->id,
        ]);

        $this->partida = Partida::create([
            'obra_id' => $this->obra->id,
            'codigo' => '01.01.01',
            'descripcion' => 'Movimiento de Tierras y Excavación',
            'unidad' => 'M3',
            'metrado' => 5000.00,
            'costo_unitario' => 25.00,
            'avance_pct' => 0.00,
        ]);

        $this->almacen = Almacen::create([
            'obra_id' => $this->obra->id,
            'codigo' => 'ALM-OBR-01',
            'nombre' => 'Almacén de Obra El Tambo',
            'tipo' => 'obra',
            'activo' => true,
        ]);

        $catId = DB::table('categorias_material')->insertGetId([
            'nombre' => 'Agregados',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $unId = DB::table('unidades_medida')->insertGetId([
            'codigo' => 'M3',
            'nombre' => 'Metro Cúbico',
        ]);

        $this->material = Material::create([
            'codigo' => 'MAT-ARENA-GR',
            'nombre' => 'Arena Gruesa Río Mantaro',
            'categoria_id' => $catId,
            'unidad_id' => $unId,
            'criticidad' => 'media',
            'activo' => true,
        ]);
    }

    public function test_gestion_ciclo_de_vida_fases_e_hitos_pmi(): void
    {
        // 0. Aprobar la fase previa obligatoria (secuencia de fases)
        $this->postJson("/api/v1/proyectos/{$this->obra->id}/fases", [
            'fase' => 'inicio',
            'estado' => 'aprobada',
        ])->assertStatus(200);

        // 1. Gestionar fase
        $faseResp = $this->postJson("/api/v1/proyectos/{$this->obra->id}/fases", [
            'fase' => 'planificacion',
            'estado' => 'aprobada',
            'observaciones' => 'Plan de Gestión del Proyecto aprobado por la PMU',
        ]);

        $faseResp->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.fase', 'planificacion')
            ->assertJsonPath('data.estado', 'aprobada');

        // 2. Crear hito de cronograma
        $hitoResp = $this->postJson("/api/v1/proyectos/{$this->obra->id}/hitos", [
            'nombre' => 'Culminación de Movimiento de Tierras Tramo 1',
            'fecha_planificada' => '2026-11-15',
            'estado' => 'pendiente',
        ]);

        $hitoResp->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.nombre', 'Culminación de Movimiento de Tierras Tramo 1');
    }

    public function test_registro_avance_fisico_partidas(): void
    {
        $payload = [
            'obra_id' => $this->obra->id,
            'partida_id' => $this->partida->id,
            'periodo' => '2026-10-01',
            'metrado_ejecutado' => 2500.00,
            'avance_pct_acumulado' => 50.00,
        ];

        $response = $this->postJson('/api/v1/avances-fisicos', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.metrado_ejecutado', '2500.000')
            ->assertJsonPath('data.avance_pct_acumulado', '50.00');

        $this->partida->refresh();
        $this->assertEquals(50.00, (float) $this->partida->avance_pct);
    }

    public function test_calculo_indicadores_evm_en_valorizacion(): void
    {
        // PV = 400,000, EV = 450,000, AC = 420,000, BAC = 1,000,000
        $payload = [
            'obra_id' => $this->obra->id,
            'periodo' => '2026-10-01',
            'valor_planificado' => 400000.00,
            'valor_ganado' => 450000.00,
            'costo_real' => 420000.00,
        ];

        $response = $this->postJson('/api/v1/valorizaciones', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.evm.pv', 400000)
            ->assertJsonPath('data.evm.ev', 450000)
            ->assertJsonPath('data.evm.ac', 420000)
            ->assertJsonPath('data.evm.cv', 30000) // EV - AC = 450k - 420k = +30k
            ->assertJsonPath('data.evm.sv', 50000) // EV - PV = 450k - 400k = +50k
            ->assertJsonPath('data.evm.estado_costo', 'bajo_presupuesto')
            ->assertJsonPath('data.evm.estado_cronograma', 'adelantado');

        $valId = $response->json('data.id');

        // Aprobar valorización
        $aprobResp = $this->postJson("/api/v1/valorizaciones/{$valId}/aprobar");
        $aprobResp->assertStatus(200)
            ->assertJsonPath('data.estado', 'aprobada');
    }

    public function test_matriz_de_riesgos_severidad_y_mitigacion(): void
    {
        $payload = [
            'obra_id' => $this->obra->id,
            'descripcion' => 'Lluvias intensas de temporada que pueden inundar canteras de agregados',
            'categoria' => 'ambiental',
            'probabilidad' => 4,
            'impacto' => 3,
            'respuesta' => 'Stockear agregados con 30 días de anticipación en almacén principal',
        ];

        $response = $this->postJson('/api/v1/riesgos', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.severidad', 12)
            ->assertJsonPath('data.estado', 'abierto');

        $riesgoId = $response->json('data.id');

        // Mitigar riesgo
        $updateResp = $this->putJson("/api/v1/riesgos/{$riesgoId}", [
            'estado' => 'mitigado',
            'impacto' => 1,
        ]);

        $updateResp->assertStatus(200)
            ->assertJsonPath('data.estado', 'mitigado')
            ->assertJsonPath('data.severidad', 4);
    }

    public function test_solicitud_cambio_impacto_en_linea_base_costo(): void
    {
        $payload = [
            'obra_id' => $this->obra->id,
            'tipo' => 'costo',
            'descripcion' => 'Adicional N° 1 por mejora de subrasante con material granular',
            'impacto_plazo_dias' => 15,
            'impacto_costo' => 85000.00,
        ];

        $response = $this->postJson('/api/v1/solicitudes-cambio', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.estado', 'solicitada');

        $scId = $response->json('data.id');

        // Aprobar por el Comité de Control de Cambios
        $evalResp = $this->postJson("/api/v1/solicitudes-cambio/{$scId}/evaluar", [
            'estado' => 'aprobada',
        ]);

        $evalResp->assertStatus(200)
            ->assertJsonPath('data.estado', 'aprobada');

        // Verificar nueva línea base de costo vigente (BAC = 1,000,000 + 85,000 = 1,085,000)
        $lineaBaseVigente = LineaBaseCosto::where('obra_id', $this->obra->id)
            ->where('vigente', true)
            ->first();

        $this->assertNotNull($lineaBaseVigente);
        $this->assertEquals(2, $lineaBaseVigente->version);
        $this->assertEquals(1085000.00, (float) $lineaBaseVigente->bac);
    }

    public function test_cierre_obra_y_deteccion_automatica_de_excedentes(): void
    {
        // Almacén tiene 150 M3 de arena gruesa sobrante al finalizar
        StockAlmacen::create([
            'almacen_id' => $this->almacen->id,
            'material_id' => $this->material->id,
            'cantidad' => 150.00,
            'cantidad_reservada' => 0.00,
        ]);

        // Iniciar cierre de obra
        $cierreResp = $this->postJson("/api/v1/cierres-obra/{$this->obra->id}/iniciar");

        $cierreResp->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.estado', 'en_cierre');

        // Consultar estado de cierre y excedentes detectados
        $showResp = $this->getJson("/api/v1/cierres-obra/{$this->obra->id}");

        $showResp->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.excedentes.0.material_id', $this->material->id)
            ->assertJsonPath('data.excedentes.0.cantidad', '150.000');

        // Finalizar y liquidar
        $finResp = $this->postJson("/api/v1/cierres-obra/{$this->obra->id}/finalizar");
        $finResp->assertStatus(200);

        $this->obra->refresh();
        $this->assertEquals('liquidada', $this->obra->estado);
    }
}
