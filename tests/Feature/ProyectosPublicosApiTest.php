<?php

use App\Models\Obra;
use App\Models\Programa;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * @return array{programa: Programa}
 */
function crearProyectosPublicos(): array
{
    $programa = Programa::create([
        'nombre' => 'Programa de Infraestructura Educativa y Vial',
        'estado' => 'activo',
    ]);

    Obra::create([
        'programa_id' => $programa->id,
        'codigo' => 'OBR-A',
        'nombre' => 'Obra A',
        'estado' => 'ejecucion',
        'distrito' => 'El Tambo',
        'avance_fisico_pct' => 42.5,
        'presupuesto_base' => 1500000.00,
    ]);

    Obra::create([
        'programa_id' => $programa->id,
        'codigo' => 'OBR-B',
        'nombre' => 'Obra B',
        'estado' => 'cerrada',
        'distrito' => 'Chilca',
        'avance_fisico_pct' => 100,
    ]);

    Obra::create([
        'programa_id' => $programa->id,
        'codigo' => 'OBR-C',
        'nombre' => 'Obra C',
        'estado' => 'ejecucion',
        'distrito' => 'Chilca',
        'avance_fisico_pct' => 10,
    ]);

    return compact('programa');
}

test('la portada consulta los proyectos sin sesión y recibe solo campos públicos', function () {
    crearProyectosPublicos();

    $response = $this->getJson('/api/v1/proyectos');

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonCount(3, 'data')
        ->assertJsonPath('meta.total', 3)
        ->assertJsonPath('data.0.codigo', 'OBR-A')
        ->assertJsonPath('data.0.nombre', 'Obra A')
        ->assertJsonPath('data.0.programa', 'Programa de Infraestructura Educativa y Vial')
        ->assertJsonPath('data.0.distrito', 'El Tambo')
        ->assertJsonPath('data.0.estado', 'ejecucion')
        ->assertJsonPath('data.0.avance', 42.5)
        ->assertJsonStructure([
            'data' => [
                ['id', 'codigo', 'nombre', 'programa', 'distrito', 'estado', 'avance'],
            ],
        ])
        ->assertJsonMissingPath('data.0.presupuesto_base')
        ->assertJsonMissingPath('data.0.residente_id');
});

test('el listado público filtra por estado', function () {
    crearProyectosPublicos();

    $response = $this->getJson('/api/v1/proyectos?estado=cerrada');

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.codigo', 'OBR-B')
        ->assertJsonPath('meta.total', 1);
});

test('el listado público filtra por distrito', function () {
    crearProyectosPublicos();

    $response = $this->getJson('/api/v1/proyectos?distrito=Chilca');

    $response->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.codigo', 'OBR-B')
        ->assertJsonPath('data.1.codigo', 'OBR-C');
});
