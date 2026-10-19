<?php

use App\Models\Asistencia;
use App\Models\Obra;
use App\Models\Programa;
use App\Models\Trabajador;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function usuarioAsistencia(): Usuario
{
    return Usuario::create([
        'name' => 'Residente de Obra',
        'email' => 'asistencia@pillcomarca.pe',
        'password' => 'password123',
        'activo' => true,
    ]);
}

/**
 * @return array{obra: Obra, trabajador: Trabajador}
 */
function datosAsistencia(): array
{
    $programa = Programa::create([
        'codigo' => 'PRG-ASI-01',
        'nombre' => 'Programa de Asistencia',
        'estado' => 'activo',
    ]);

    $obra = Obra::create([
        'programa_id' => $programa->id,
        'codigo' => 'OBR-ASI-01',
        'nombre' => 'Obra de Asistencia',
        'estado' => 'ejecucion',
        'latitud' => -12.0651,
        'longitud' => -75.2049,
    ]);

    $trabajador = Trabajador::create([
        'obra_id' => $obra->id,
        'dni' => '45678912',
        'nombres' => 'Juan Operario',
        'cargo' => 'Operario',
        'activo' => true,
    ]);

    return ['obra' => $obra, 'trabajador' => $trabajador];
}

test('la marcación consolida la asistencia del día y refresca la vista', function () {
    ['obra' => $obra, 'trabajador' => $trabajador] = datosAsistencia();

    $this->actingAsConRol(usuarioAsistencia());

    $ubicacion = ['latitud' => -12.0651, 'longitud' => -75.2049];

    $this->travelTo(now()->setTime(8, 0));
    $this->postJson('/api/v1/personal/marcaciones', [
        'trabajador_id' => $trabajador->id,
        'obra_id' => $obra->id,
        'tipo' => 'entrada',
        ...$ubicacion,
    ])->assertStatus(201)->assertJsonPath('asistencia.estado', 'observada');

    $this->travelTo(now()->setTime(16, 0));
    $respuesta = $this->postJson('/api/v1/personal/marcaciones', [
        'trabajador_id' => $trabajador->id,
        'obra_id' => $obra->id,
        'tipo' => 'salida',
        ...$ubicacion,
    ]);

    $respuesta->assertStatus(201)
        ->assertJsonPath('asistencia.estado', 'consolidada')
        ->assertJsonPath('asistencia.inconsistencia', null);

    $asistencia = Asistencia::where('trabajador_id', $trabajador->id)->firstOrFail();
    expect((float) $asistencia->horas_trabajadas)->toBe(8.0);

    $this->travelBack();

    $page = $this->get('/personal/asistencia');
    $page->assertOk();
    $page->assertInertia(fn ($page) => $page
        ->component('AsistenciaPage')
        ->has('asistenciasDb')
        ->where('asistenciasDb', fn ($asistencias) => collect($asistencias)->contains(
            fn ($a) => (int) $a['trabajador_id'] === $trabajador->id
                && (float) $a['horas_trabajadas'] === 8.0
        ))
    );
});

test('una marcación fuera de la geocerca marca la asistencia como inconsistente', function () {
    ['obra' => $obra, 'trabajador' => $trabajador] = datosAsistencia();

    $this->actingAsConRol(usuarioAsistencia());

    $this->postJson('/api/v1/personal/marcaciones', [
        'trabajador_id' => $trabajador->id,
        'obra_id' => $obra->id,
        'tipo' => 'entrada',
        'latitud' => -12.2000,
        'longitud' => -75.4000,
    ])->assertStatus(201);

    $asistencia = Asistencia::where('trabajador_id', $trabajador->id)->firstOrFail();

    expect($asistencia->inconsistencia)->toBe('fuera_geocerca')
        ->and($asistencia->estado)->toBe('observada');
});
