<?php

use App\Models\Obra;
use App\Models\Programa;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function crearObraPublica(): Obra
{
    $programa = Programa::create([
        'nombre' => 'Programa de Infraestructura Vial',
        'descripcion' => 'Mejoramiento de vías locales.',
        'estado' => 'activo',
    ]);

    return Obra::create([
        'programa_id' => $programa->id,
        'codigo' => 'OBR-PUB-01',
        'nombre' => 'Mejoramiento Vía El Tambo',
        'direccion' => 'Av. Los Andes 123',
        'distrito' => 'El Tambo',
        'estado' => 'ejecucion',
        'avance_fisico_pct' => 42.5,
        'presupuesto_base' => 999999.99,
        'latitud' => -12.0651,
        'longitud' => -75.2049,
    ]);
}

test('el detalle público es accesible sin sesión y no expone datos internos', function () {
    $obra = crearObraPublica();

    $response = $this->get('/proyectos/'.$obra->id);

    $response->assertOk()
        ->assertSee('Mejoramiento Vía El Tambo')
        ->assertSee('Av. Los Andes 123')
        ->assertSee('og:title')
        ->assertSee('og:description')
        ->assertDontSee('-75.2049')
        ->assertDontSee('999999');
});

test('el detalle público muestra la fotografía referencial y su crédito', function () {
    $programa = Programa::create([
        'nombre' => 'Programa de Infraestructura Vial',
        'estado' => 'activo',
    ]);

    $obra = Obra::create([
        'programa_id' => $programa->id,
        'codigo' => 'OBR-02',
        'nombre' => 'Mejoramiento Vial Av. Huancavelica',
        'distrito' => 'El Tambo',
        'estado' => 'ejecucion',
        'avance_fisico_pct' => 42,
    ]);

    $this->get('/proyectos/'.$obra->id)
        ->assertOk()
        ->assertSee('/assets/proyectos/mejoramiento-vial.jpg', false)
        ->assertSee('Thayne Tuason / Wikimedia Commons', false)
        ->assertSee('og:image', false);

    $this->assertFileExists(public_path('assets/proyectos/mejoramiento-vial.jpg'));
});

test('el detalle de un proyecto inexistente responde como no encontrado', function () {
    $this->get('/proyectos/99999')->assertStatus(404);
});

test('el detalle interno de la API requiere identidad', function () {
    $this->getJson('/api/v1/proyectos/1')->assertStatus(401);
});
