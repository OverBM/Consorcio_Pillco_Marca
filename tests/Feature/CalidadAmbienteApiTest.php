<?php

use App\Models\Almacen;
use App\Models\EmpresaEors;
use App\Models\IndicadorAmbiental;
use App\Models\Obra;
use App\Models\Programa;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function contextoCalidadAmbiente(): array
{
    Usuario::create([
        'name' => 'Jefe de Calidad',
        'email' => 'calidad@pillcomarca.pe',
        'password' => bcrypt('secret123'),
        'activo' => true,
    ]);

    $programa = Programa::create([
        'nombre' => 'Programa Calidad',
        'estado' => 'activo',
    ]);

    $obra = Obra::create([
        'programa_id' => $programa->id,
        'codigo' => 'OBR-CAL',
        'nombre' => 'Obra Calidad',
        'estado' => 'ejecucion',
        'distrito' => 'El Tambo',
    ]);

    $almacen = Almacen::create([
        'obra_id' => $obra->id,
        'codigo' => 'ALM-CAL',
        'nombre' => 'Almacén de Obra',
        'tipo' => 'principal',
        'activo' => true,
    ]);

    $indicador = IndicadorAmbiental::create([
        'codigo' => 'RU-DIA',
        'nombre' => 'Nivel de Presión Sonora Diurno',
        'unidad' => 'dBA',
        'limite_maximo' => 85,
    ]);

    $eors = EmpresaEors::create([
        'ruc' => '20123456789',
        'razon_social' => 'ECO AMBIENTAL HUANCAYO SAC',
    ]);

    return [$obra, $almacen, $indicador, $eors];
}

test('el endpoint de calidad registra y levanta una observación técnica', function () {
    [$obra] = contextoCalidadAmbiente();

    $crear = $this->postJson('/api/v1/calidad/observaciones', [
        'obra_id' => $obra->id,
        'numero_acta' => 'ACTA-SUP-012',
        'descripcion' => 'Segregación leve de concreto en estribo izquierdo.',
        'origen' => 'supervision',
        'plazo_subsanacion' => now()->addDays(5)->toDateString(),
    ]);

    $crear->assertCreated()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.estado', 'notificada');

    $id = $crear->json('data.id');

    $this->postJson("/api/v1/calidad/observaciones/{$id}/levantar", [
        'planos_asbuilt_actualizados' => true,
    ])
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.estado', 'levantada')
        ->assertJsonPath('data.planos_asbuilt_actualizados', true);
});

test('el endpoint de mediciones marca fuera de límite al superar el LMP', function () {
    [$obra, , $indicador] = contextoCalidadAmbiente();

    $response = $this->postJson('/api/v1/ambiente/mediciones', [
        'obra_id' => $obra->id,
        'indicador_id' => $indicador->id,
        'valor' => 91.2,
        'medida_correctiva' => 'Silenciador instalado en compresora.',
    ]);

    $response->assertCreated()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.fuera_de_limite', true)
        ->assertJsonPath('data.indicador.nombre', 'Nivel de Presión Sonora Diurno');
});

test('el endpoint de residuos registra un residuo reutilizable', function () {
    [$obra, $almacen, , $eors] = contextoCalidadAmbiente();

    $response = $this->postJson('/api/v1/ambiente/residuos', [
        'obra_id' => $obra->id,
        'almacen_id' => $almacen->id,
        'clase' => 'reutilizable',
        'descripcion' => 'Desmonte limpio de excavación masiva.',
        'volumen' => 120.5,
        'unidad' => 'M3',
        'destino' => 'reutilizacion',
        'eors_id' => $eors->id,
    ]);

    $response->assertCreated()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.clase', 'reutilizable')
        ->assertJsonPath('data.eors.razon_social', 'ECO AMBIENTAL HUANCAYO SAC');
});
