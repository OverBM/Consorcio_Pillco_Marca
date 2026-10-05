<?php

namespace Tests\Feature;

use App\Models\Almacen;
use App\Models\IndicadorAmbiental;
use App\Models\Material;
use App\Models\Obra;
use App\Models\Programa;
use App\Models\StockAlmacen;
use App\Models\Trabajador;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PersonalSstCalidadAmbienteApiTest extends TestCase
{
    use RefreshDatabase;

    protected Usuario $usuario;

    protected Obra $obra;

    protected Trabajador $trabajador;

    protected Almacen $almacen;

    protected Material $materialEpp;

    protected IndicadorAmbiental $indicador;

    protected function setUp(): void
    {
        parent::setUp();

        $this->usuario = Usuario::create([
            'name' => 'Supervisor SST Calidad',
            'email' => 'sst@pillcomarca.pe',
            'password' => bcrypt('secret123'),
            'activo' => true,
        ]);

        $programa = Programa::create([
            'codigo' => 'PRG-SST-01',
            'nombre' => 'Programa Junín Central',
            'estado' => 'activo',
        ]);

        $this->obra = Obra::create([
            'programa_id' => $programa->id,
            'codigo' => 'OBR-HUANCAYO-SST',
            'nombre' => 'Puente Comuneros II',
            'estado' => 'ejecucion',
            'departamento' => 'Junin',
            'provincia' => 'Huancayo',
            'distrito' => 'Huamancaca Chico',
            'latitud' => -12.0833,
            'longitud' => -75.2167,
        ]);

        $this->trabajador = Trabajador::create([
            'dni' => '47895612',
            'nombres' => 'Juan Quispe Mayta',
            'cargo' => 'Operario Fierrero',
            'obra_id' => $this->obra->id,
            'activo' => true,
        ]);

        $this->almacen = Almacen::create([
            'obra_id' => $this->obra->id,
            'codigo' => 'ALM-SST-01',
            'nombre' => 'Almacén Central Comuneros',
            'tipo' => 'obra',
            'activo' => true,
        ]);

        $catId = DB::table('categorias_material')->insertGetId([
            'nombre' => 'Equipos de Protección Personal',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $unId = DB::table('unidades_medida')->insertGetId([
            'codigo' => 'UND',
            'nombre' => 'Unidad',
        ]);

        $this->materialEpp = Material::create([
            'codigo' => 'EPP-CASCO-BL',
            'nombre' => 'Casco de Seguridad 3M Blanco con Barboquejo',
            'categoria_id' => $catId,
            'unidad_id' => $unId,
            'criticidad' => 'alta',
            'activo' => true,
        ]);

        $this->indicador = IndicadorAmbiental::create([
            'codigo' => 'IND-RUIDO',
            'nombre' => 'Nivel de Presión Sonora Diurno',
            'unidad' => 'dBA',
            'limite_maximo' => 85.000,
        ]);
    }

    public function test_marcacion_con_geocerca_valida_dentro_y_fuera(): void
    {
        // 1. Marcación dentro del radio (coordenadas casi idénticas a la obra)
        $respDentro = $this->postJson('/api/v1/personal/marcaciones', [
            'trabajador_id' => $this->trabajador->id,
            'obra_id' => $this->obra->id,
            'tipo' => 'entrada',
            'latitud' => -12.0834,
            'longitud' => -75.2168,
        ]);

        $respDentro->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.dentro_geocerca', true);

        // 2. Marcación fuera del radio (en el centro de Huancayo a varios km)
        $respFuera = $this->postJson('/api/v1/personal/marcaciones', [
            'trabajador_id' => $this->trabajador->id,
            'obra_id' => $this->obra->id,
            'tipo' => 'salida',
            'latitud' => -12.0650,
            'longitud' => -75.2040,
        ]);

        $respFuera->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.dentro_geocerca', false);
    }

    public function test_generar_planilla_de_obra(): void
    {
        $payload = [
            'obra_id' => $this->obra->id,
            'periodo' => '2026-10-Q1',
        ];

        $response = $this->postJson('/api/v1/personal/planillas/generar', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.estado', 'procesada')
            ->assertJsonPath('data.total', '2400.00');
    }

    public function test_reportar_incidente_sst(): void
    {
        $payload = [
            'obra_id' => $this->obra->id,
            'trabajador_id' => $this->trabajador->id,
            'tipo' => 'accidente',
            'gravedad' => 'leve',
            'ocurrido_en' => '2026-10-04 15:30:00',
            'descripcion' => 'Tropezón con fierros en plataforma de habilitación de vigas',
            'requiere_traslado' => false,
            'causas' => 'Falta de orden y limpieza en la zona de acopio',
        ];

        $response = $this->postJson('/api/v1/sst/incidentes', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.gravedad', 'leve')
            ->assertJsonPath('data.estado', 'reportado');
    }

    public function test_asignar_epp_con_descuento_de_stock_en_almacen(): void
    {
        // 1. Cargar stock de cascos en almacén
        StockAlmacen::create([
            'almacen_id' => $this->almacen->id,
            'material_id' => $this->materialEpp->id,
            'cantidad' => 20.00,
            'cantidad_reservada' => 0.00,
        ]);

        // 2. Asignar 1 casco con número de serie al operario
        $payload = [
            'trabajador_id' => $this->trabajador->id,
            'almacen_id' => $this->almacen->id,
            'material_id' => $this->materialEpp->id,
            'numero_serie' => '3M-CSC-2026-0098',
        ];

        $response = $this->postJson('/api/v1/sst/epp-asignaciones', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.numero_serie', '3M-CSC-2026-0098');

        // 3. Verificar que el stock disminuyó en 1 unidad
        $stock = StockAlmacen::where('almacen_id', $this->almacen->id)
            ->where('material_id', $this->materialEpp->id)
            ->first();

        $this->assertEquals(19.00, (float) $stock->cantidad);
    }

    public function test_observacion_tecnica_y_levantamiento_calidad(): void
    {
        // 1. Notificar observación técnica
        $storeResp = $this->postJson('/api/v1/calidad/observaciones', [
            'obra_id' => $this->obra->id,
            'numero_acta' => 'ACTA-SUP-012',
            'descripcion' => 'Segregación leve de concreto en estribo izquierdo eje 1',
            'origen' => 'supervision',
            'plazo_subsanacion' => '2026-10-10',
            'evidencia_ruta' => '/storage/calidad/obs-estribo.jpg',
        ]);

        $storeResp->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.estado', 'notificada');

        $obsId = $storeResp->json('data.id');

        // 2. Levantar observación técnica con evidencia y planos actualizados
        $levantarResp = $this->postJson("/api/v1/calidad/observaciones/{$obsId}/levantar", [
            'evidencia_subsanacion_ruta' => '/storage/calidad/subsanacion-estribo.jpg',
            'planos_asbuilt_actualizados' => true,
        ]);

        $levantarResp->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.estado', 'levantada')
            ->assertJsonPath('data.planos_asbuilt_actualizados', true);
    }

    public function test_medicion_ambiental_y_alerta_por_exceder_limite(): void
    {
        // Medición de 92 dBA (supera límite de 85 dBA)
        $payload = [
            'obra_id' => $this->obra->id,
            'indicador_id' => $this->indicador->id,
            'valor' => 92.500,
            'medida_correctiva' => 'Uso obligatorio de doble protección auditiva e instalación de silenciador en compresora',
        ];

        $response = $this->postJson('/api/v1/ambiente/mediciones', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.fuera_de_limite', true);
    }

    public function test_registro_de_residuos_para_reutilizacion_o_eors(): void
    {
        $payload = [
            'obra_id' => $this->obra->id,
            'almacen_id' => $this->almacen->id,
            'clase' => 'reutilizable',
            'descripcion' => 'Madera de encofrado recuperada para estacas de trazo',
            'volumen' => 12.500,
            'unidad' => 'M3',
            'destino' => 'reutilizacion',
        ];

        $response = $this->postJson('/api/v1/ambiente/residuos', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.clase', 'reutilizable')
            ->assertJsonPath('data.estado', 'registrado');
    }
}
