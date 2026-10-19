<?php

use App\Models\Almacen;
use App\Models\ExcedenteDetectado;
use App\Models\Material;
use App\Models\Obra;
use App\Models\Programa;
use App\Models\Transferencia;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function usuarioExcedentes(string $email = 'excedentes@pillcomarca.pe'): Usuario
{
    return Usuario::create([
        'name' => 'Gestor de Excedentes',
        'email' => $email,
        'password' => 'password123',
        'activo' => true,
    ]);
}

/**
 * @return array{obra: Obra, almacen: Almacen, material: Material}
 */
function datosExcedentes(): array
{
    $programa = Programa::create([
        'codigo' => 'PRG-EXC-01',
        'nombre' => 'Programa de Excedentes',
        'estado' => 'activo',
    ]);

    $obra = Obra::create([
        'programa_id' => $programa->id,
        'codigo' => 'OBR-EXC-01',
        'nombre' => 'Obra de Excedentes',
        'estado' => 'ejecucion',
        'latitud' => -12.0651,
        'longitud' => -75.2049,
    ]);

    $almacen = Almacen::create([
        'obra_id' => $obra->id,
        'codigo' => 'ALM-EXC-01',
        'nombre' => 'Almacén de Excedentes',
        'activo' => true,
        'latitud' => -12.0651,
        'longitud' => -75.2049,
    ]);

    $catId = DB::table('categorias_material')->insertGetId([
        'nombre' => 'Agregados',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $unId = DB::table('unidades_medida')->insertGetId([
        'codigo' => 'UND',
        'nombre' => 'Unidad',
    ]);

    $material = Material::create([
        'codigo' => 'MAT-EXC-01',
        'nombre' => 'Material de Excedentes',
        'categoria_id' => $catId,
        'unidad_id' => $unId,
        'criticidad' => 'media',
        'activo' => true,
    ]);

    return ['obra' => $obra, 'almacen' => $almacen, 'material' => $material];
}

test('crea, edita y elimina excedentes detectados', function () {
    ['obra' => $obra, 'almacen' => $almacen, 'material' => $material] = datosExcedentes();

    $this->actingAsConRol(usuarioExcedentes());

    $crear = $this->postJson('/api/v1/excedentes', [
        'obra_origen_id' => $obra->id,
        'almacen_id' => $almacen->id,
        'material_id' => $material->id,
        'cantidad' => 120.5,
        'origen' => 'cierre_obra',
    ]);

    $crear->assertStatus(201)
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.cantidad', '120.500');

    $id = $crear->json('data.id');

    $editar = $this->putJson("/api/v1/excedentes/{$id}", [
        'obra_origen_id' => $obra->id,
        'almacen_id' => $almacen->id,
        'material_id' => $material->id,
        'cantidad' => 80,
        'origen' => 'cierre_obra',
        'estado' => 'sugerido',
    ]);

    $editar->assertStatus(200)
        ->assertJsonPath('data.cantidad', '80.000')
        ->assertJsonPath('data.estado', 'sugerido');

    $this->deleteJson("/api/v1/excedentes/{$id}")->assertStatus(200)->assertJsonPath('success', true);

    expect(ExcedenteDetectado::count())->toBe(0);
});

test('exige identidad y permiso de programa para mutar excedentes', function () {
    ['obra' => $obra, 'almacen' => $almacen, 'material' => $material] = datosExcedentes();

    $payload = [
        'obra_origen_id' => $obra->id,
        'almacen_id' => $almacen->id,
        'material_id' => $material->id,
        'cantidad' => 10,
        'origen' => 'manual',
    ];

    $this->postJson('/api/v1/excedentes', $payload)->assertStatus(401);

    $sinPermiso = usuarioExcedentes('sin-permiso@pillcomarca.pe');
    $this->actingAs($sinPermiso);

    $this->postJson('/api/v1/excedentes', $payload)->assertStatus(403);
});

test('genera una transferencia sugerida desde un excedente', function () {
    ['obra' => $obra, 'almacen' => $almacen, 'material' => $material] = datosExcedentes();

    $destino = Almacen::create([
        'obra_id' => $obra->id,
        'codigo' => 'ALM-EXC-02',
        'nombre' => 'Almacén Destino',
        'activo' => true,
    ]);

    $this->actingAsConRol(usuarioExcedentes());

    $excedente = ExcedenteDetectado::create([
        'obra_origen_id' => $obra->id,
        'almacen_id' => $almacen->id,
        'material_id' => $material->id,
        'cantidad' => 50,
        'origen' => 'cierre_obra',
        'estado' => 'detectado',
        'detectado_en' => now(),
    ]);

    $response = $this->postJson("/api/v1/excedentes/{$excedente->id}/transferencia", [
        'almacen_destino_id' => $destino->id,
        'cantidad' => 40,
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.estado', 'sugerida')
        ->assertJsonPath('data.excedente_id', $excedente->id);

    expect($excedente->fresh()->estado)->toBe('redistribuido');
    expect(Transferencia::where('excedente_id', $excedente->id)->exists())->toBeTrue();
});

test('rechaza transferir al mismo almacén de origen', function () {
    ['obra' => $obra, 'almacen' => $almacen, 'material' => $material] = datosExcedentes();

    $this->actingAsConRol(usuarioExcedentes());

    $excedente = ExcedenteDetectado::create([
        'obra_origen_id' => $obra->id,
        'almacen_id' => $almacen->id,
        'material_id' => $material->id,
        'cantidad' => 20,
        'origen' => 'manual',
        'estado' => 'detectado',
        'detectado_en' => now(),
    ]);

    $this->postJson("/api/v1/excedentes/{$excedente->id}/transferencia", [
        'almacen_destino_id' => $almacen->id,
    ])->assertStatus(422);
});

test('la vista de redistribución refleja los excedentes persistidos con sus props', function () {
    ['obra' => $obra, 'almacen' => $almacen, 'material' => $material] = datosExcedentes();

    $this->seed();

    $usuario = usuarioExcedentes();
    $this->actingAsConRol($usuario);

    $this->postJson('/api/v1/excedentes', [
        'obra_origen_id' => $obra->id,
        'almacen_id' => $almacen->id,
        'material_id' => $material->id,
        'cantidad' => 33,
        'origen' => 'liquidacion',
    ])->assertStatus(201);

    $response = $this->get('/programa/redistribucion');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('RedistribucionPage')
        ->has('excedentesDb')
        ->has('transferenciasAhpDb')
        ->has('obrasDb')
        ->has('almacenesDb')
        ->has('materialesDb')
        ->where('excedentesDb', fn ($excedentes) => collect($excedentes)->contains(
            fn ($e) => (float) $e['cantidad'] === 33.0
        ))
    );
});
