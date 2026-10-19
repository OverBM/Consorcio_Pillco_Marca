<?php

use App\Models\Asistencia;
use App\Models\Obra;
use App\Models\Programa;
use App\Models\Trabajador;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function contextoPersonalSst(): array
{
    $usuario = Usuario::create([
        'name' => 'Residente de Prueba',
        'email' => 'residente@pillcomarca.pe',
        'password' => bcrypt('secret123'),
        'activo' => true,
    ]);

    $programa = Programa::create([
        'nombre' => 'Programa SST',
        'estado' => 'activo',
    ]);

    $obra = Obra::create([
        'programa_id' => $programa->id,
        'codigo' => 'OBR-SST',
        'nombre' => 'Obra SST',
        'estado' => 'ejecucion',
        'distrito' => 'El Tambo',
        'latitud' => -12.0650,
        'longitud' => -75.2100,
    ]);

    $trabajador = Trabajador::create([
        'obra_id' => $obra->id,
        'dni' => '12345678',
        'nombres' => 'Juan Quispe Mayta',
        'cargo' => 'Operario Fierrero',
        'activo' => true,
    ]);

    return [$usuario, $programa, $obra, $trabajador];
}

test('la marcación dentro de la geocerca se registra como conforme', function () {
    [$usuario, , $obra, $trabajador] = contextoPersonalSst();
    $this->actingAsConRol($usuario);

    $response = $this->postJson('/api/v1/personal/marcaciones', [
        'trabajador_id' => $trabajador->id,
        'obra_id' => $obra->id,
        'tipo' => 'entrada',
        'latitud' => -12.0650,
        'longitud' => -75.2100,
    ]);

    $response->assertCreated()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.dentro_geocerca', true)
        ->assertJsonPath('data.trabajador.nombres', 'Juan Quispe Mayta');
});

test('la marcación fuera de la geocerca se registra como observada', function () {
    [$usuario, , $obra, $trabajador] = contextoPersonalSst();
    $this->actingAsConRol($usuario);

    $response = $this->postJson('/api/v1/personal/marcaciones', [
        'trabajador_id' => $trabajador->id,
        'obra_id' => $obra->id,
        'tipo' => 'entrada',
        'latitud' => -12.0750,
        'longitud' => -75.2100,
    ]);

    $response->assertCreated()->assertJsonPath('data.dentro_geocerca', false);
});

test('el endpoint de asistencias lista el consolidado con trabajador y obra', function () {
    [$usuario, , $obra, $trabajador] = contextoPersonalSst();
    $this->actingAsConRol($usuario);

    Asistencia::create([
        'trabajador_id' => $trabajador->id,
        'obra_id' => $obra->id,
        'fecha' => now()->toDateString(),
        'horas_trabajadas' => 8,
        'estado' => 'consolidada',
    ]);

    $this->getJson('/api/v1/personal/asistencias')
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.trabajador.nombres', 'Juan Quispe Mayta')
        ->assertJsonPath('data.0.obra.nombre', 'Obra SST');
});

test('el endpoint de planillas genera y procesa el periodo de la obra', function () {
    [$usuario, , $obra] = contextoPersonalSst();
    $this->actingAsConRol($usuario);

    $response = $this->postJson('/api/v1/personal/planillas/generar', [
        'obra_id' => $obra->id,
        'periodo' => '2026-10-Q1',
    ]);

    $response->assertCreated()->assertJsonPath('success', true);
    expect((float) $response->json('data.total'))->toBeGreaterThan(0);
});

test('el endpoint de incidentes reporta un nuevo evento SST', function () {
    [$usuario, , $obra, $trabajador] = contextoPersonalSst();
    $this->actingAsConRol($usuario);

    $response = $this->postJson('/api/v1/sst/incidentes', [
        'obra_id' => $obra->id,
        'trabajador_id' => $trabajador->id,
        'tipo' => 'incidente',
        'gravedad' => 'leve',
        'ocurrido_en' => now()->toDateTimeString(),
        'descripcion' => 'Tropezón con fierros en plataforma.',
        'requiere_traslado' => false,
    ]);

    $response->assertCreated()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.gravedad', 'leve')
        ->assertJsonPath('data.trabajador.nombres', 'Juan Quispe Mayta');
});

test('el endpoint de capacitaciones programa una capacitación SST', function () {
    [$usuario, , $obra] = contextoPersonalSst();
    $this->actingAsConRol($usuario);

    $response = $this->postJson('/api/v1/sst/capacitaciones', [
        'tipo' => 'sst',
        'titulo' => 'Trabajos en Altura y Uso de Arnés',
        'obra_id' => $obra->id,
        'fecha_programada' => now()->addWeek()->toDateString(),
        'instructor' => 'Ing. Prevencionista',
    ]);

    $response->assertCreated()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.titulo', 'Trabajos en Altura y Uso de Arnés');
});
