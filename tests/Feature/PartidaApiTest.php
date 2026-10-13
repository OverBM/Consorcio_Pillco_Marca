<?php

use App\Models\Obra;
use App\Models\Partida;
use App\Models\Programa;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('el endpoint de partidas registra una nueva partida de la EDT', function () {
    $programa = Programa::create([
        'nombre' => 'Programa de Prueba',
        'estado' => 'activo',
    ]);

    $obra = Obra::create([
        'programa_id' => $programa->id,
        'codigo' => 'OBR-PART',
        'nombre' => 'Obra de Partidas',
        'estado' => 'ejecucion',
        'distrito' => 'Chilca',
    ]);

    $response = $this->postJson('/api/v1/partidas', [
        'obra_id' => $obra->id,
        'codigo' => '01.02.01',
        'descripcion' => 'Concreto f\'c=210 kg/cm2 para Zapatas',
        'unidad' => 'M3',
        'metrado' => 650,
        'costo_unitario' => 420.5,
        'avance_pct' => 10,
    ]);

    $response->assertCreated()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.codigo', '01.02.01')
        ->assertJsonPath('data.obra.id', $obra->id);

    expect(Partida::where('codigo', '01.02.01')->count())->toBe(1);
});

test('el endpoint de partidas lista las partidas de una obra', function () {
    $programa = Programa::create([
        'nombre' => 'Programa de Prueba',
        'estado' => 'activo',
    ]);

    $obra = Obra::create([
        'programa_id' => $programa->id,
        'codigo' => 'OBR-PART2',
        'nombre' => 'Obra de Partidas 2',
        'estado' => 'ejecucion',
        'distrito' => 'El Tambo',
    ]);

    Partida::create([
        'obra_id' => $obra->id,
        'codigo' => '02.01.01',
        'descripcion' => 'Excavación masiva',
        'unidad' => 'M3',
        'metrado' => 100,
        'costo_unitario' => 28,
        'avance_pct' => 0,
    ]);

    $response = $this->getJson("/api/v1/partidas?obra_id={$obra->id}");

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.codigo', '02.01.01');
});
