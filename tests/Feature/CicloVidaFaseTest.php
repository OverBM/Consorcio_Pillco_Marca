<?php

use App\Models\FaseCriterio;
use App\Models\FaseRequisito;
use App\Models\LineaBaseCosto;
use App\Models\Obra;
use App\Models\ObraFase;
use App\Models\Programa;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function usuarioFase(): Usuario
{
    return Usuario::create([
        'name' => 'Gestor de Fases',
        'email' => 'fases@pillcomarca.pe',
        'password' => 'password123',
        'activo' => true,
    ]);
}

function obraFase(): Obra
{
    $programa = Programa::create([
        'codigo' => 'PRG-FASE-01',
        'nombre' => 'Programa de Fases',
        'estado' => 'activo',
    ]);

    return Obra::create([
        'programa_id' => $programa->id,
        'codigo' => 'OBR-FASE-01',
        'nombre' => 'Obra de Fases',
        'estado' => 'ejecucion',
        'avance_fisico_pct' => 40,
    ]);
}

test('no se aprueba una fase si la fase previa no está aprobada', function () {
    $obra = obraFase();

    $response = $this->actingAsConRol(usuarioFase())
        ->postJson("/api/v1/proyectos/{$obra->id}/fases", [
            'fase' => 'ejecucion',
            'estado' => 'aprobada',
        ]);

    $response->assertStatus(422)->assertJsonPath('errors.fase_previa.0', fn ($m) => str_contains($m, 'Planificación'));
});

test('no se aprueba una fase con criterios obligatorios incompletos', function () {
    $obra = obraFase();

    ObraFase::create([
        'obra_id' => $obra->id,
        'fase' => 'inicio',
        'estado' => 'aprobada',
        'aprobada_en' => now(),
    ]);

    FaseCriterio::create([
        'fase' => 'planificacion',
        'codigo' => 'documento_faltante',
        'nombre' => 'Documento inexistente',
        'tipo' => 'documento_existe',
        'parametros' => ['tipo_documento' => 'no-existe'],
        'obligatorio' => true,
        'activo' => true,
    ]);

    $response = $this->actingAsConRol(usuarioFase())
        ->postJson("/api/v1/proyectos/{$obra->id}/fases", [
            'fase' => 'planificacion',
            'estado' => 'aprobada',
        ]);

    $response->assertStatus(422)
        ->assertJsonPath('errors.criterios', fn ($errores) => count($errores) === 1);
});

test('se aprueba una fase cumpliendo la previa y los criterios', function () {
    $usuario = usuarioFase();
    $obra = obraFase();

    ObraFase::create([
        'obra_id' => $obra->id,
        'fase' => 'inicio',
        'estado' => 'aprobada',
        'aprobada_en' => now(),
    ]);

    LineaBaseCosto::create([
        'obra_id' => $obra->id,
        'version' => 1,
        'bac' => 1000000,
        'vigente' => true,
    ]);

    FaseCriterio::create([
        'fase' => 'planificacion',
        'codigo' => 'linea_base_vigente',
        'nombre' => 'Línea base vigente',
        'tipo' => 'linea_base_costo',
        'obligatorio' => true,
        'activo' => true,
    ]);

    $response = $this->actingAsConRol($usuario)
        ->postJson("/api/v1/proyectos/{$obra->id}/fases", [
            'fase' => 'planificacion',
            'estado' => 'aprobada',
        ]);

    $response->assertOk()->assertJsonPath('data.estado', 'aprobada');

    $fase = ObraFase::where('obra_id', $obra->id)->where('fase', 'planificacion')->firstOrFail();
    expect($fase->estado)->toBe('aprobada')
        ->and($fase->aprobada_en)->not->toBeNull()
        ->and($fase->aprobada_por)->toBe($usuario->id);
});

test('un criterio manual exige justificación para aprobar', function () {
    $usuario = usuarioFase();
    $obra = obraFase();

    ObraFase::create([
        'obra_id' => $obra->id,
        'fase' => 'inicio',
        'estado' => 'aprobada',
        'aprobada_en' => now(),
    ]);

    FaseCriterio::create([
        'fase' => 'planificacion',
        'codigo' => 'justificar',
        'nombre' => 'Justificación manual',
        'tipo' => 'manual_justificado',
        'obligatorio' => true,
        'activo' => true,
    ]);

    $this->actingAsConRol($usuario)
        ->postJson("/api/v1/proyectos/{$obra->id}/fases", [
            'fase' => 'planificacion',
            'estado' => 'aprobada',
        ])
        ->assertStatus(422);

    $this->actingAsConRol($usuario)
        ->postJson("/api/v1/proyectos/{$obra->id}/fases", [
            'fase' => 'planificacion',
            'estado' => 'aprobada',
            'justificaciones' => ['justificar' => 'Criterio aceptado por la supervisión.'],
        ])
        ->assertOk();
});

test('rechaza un criterio con tipo de verificación no soportado', function () {
    $response = $this->actingAsConRol(usuarioFase())
        ->postJson('/api/v1/admin/fases/criterios', [
            'fase' => 'inicio',
            'codigo' => 'invalido',
            'nombre' => 'Criterio inválido',
            'tipo' => 'tipo_inventado',
            'obligatorio' => true,
        ]);

    $response->assertStatus(422)->assertJsonValidationErrors('tipo');
});

test('administra requisitos y criterios de fase', function () {
    $usuario = usuarioFase();
    $this->actingAsConRol($usuario);

    $requisito = $this->postJson('/api/v1/admin/fases/requisitos', [
        'fase' => 'inicio',
        'codigo' => 'expediente',
        'nombre' => 'Expediente técnico',
        'orden' => 1,
    ])->assertStatus(201)->json('data.id');

    $this->putJson("/api/v1/admin/fases/requisitos/{$requisito}", [
        'fase' => 'inicio',
        'codigo' => 'expediente',
        'nombre' => 'Expediente técnico aprobado',
        'activo' => false,
    ])->assertOk()->assertJsonPath('data.nombre', 'Expediente técnico aprobado');

    $criterio = $this->postJson('/api/v1/admin/fases/criterios', [
        'fase' => 'inicio',
        'codigo' => 'kpi_avance',
        'nombre' => 'Avance mínimo',
        'tipo' => 'kpi_valor',
        'parametros' => ['metrica' => 'avance_fisico_pct', 'operador' => '>=', 'valor' => 10],
        'obligatorio' => true,
    ])->assertStatus(201)->json('data.id');

    expect(FaseRequisito::count())->toBe(1)
        ->and(FaseCriterio::count())->toBe(1);

    $this->getJson('/api/v1/admin/fases')
        ->assertOk()
        ->assertJsonStructure(['data' => ['fases', 'tipos_criterio']]);

    $this->deleteJson("/api/v1/admin/fases/requisitos/{$requisito}")->assertOk();
    $this->deleteJson("/api/v1/admin/fases/criterios/{$criterio}")->assertOk();

    expect(FaseRequisito::count())->toBe(0)
        ->and(FaseCriterio::count())->toBe(0);
});

test('la vista de ciclo de vida muestra fases canónicas, requisitos y cumplimiento', function () {
    $this->seed();

    $response = $this->actingAsConRol(usuarioFase())->get('/gestion-obra/ciclo-vida');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('CicloVidaPage')
        ->has('fasesCatalogo', 5)
        ->where('fasesCatalogo.0.codigo', 'inicio')
        ->where('fasesCatalogo.4.codigo', 'cierre')
        ->has('requisitosDb')
        ->has('criteriosDb')
        ->has('evaluacionesDb')
    );

    expect(ObraFase::where('fase', 'monitoreo_control')->exists())->toBeTrue();
    expect(ObraFase::where('fase', 'seguimiento_control')->exists())->toBeFalse();
    expect(ObraFase::where('estado', 'aprobada')->count())->toBeGreaterThan(0);
});
