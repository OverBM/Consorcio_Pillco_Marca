<?php

use App\Models\Almacen;
use App\Models\Obra;
use App\Models\Programa;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * @return array{usuario: Usuario, obraA: Obra, obraB: Obra, obraC: Obra, almacenA: Almacen}
 */
function crearContextoOperativo(): array
{
    $usuario = Usuario::create([
        'name' => 'Residente de Prueba',
        'email' => 'residente@pillcomarca.pe',
        'password' => bcrypt('secret123'),
        'activo' => true,
    ]);

    $programa = Programa::create([
        'codigo' => 'PRG-CONTEXTO',
        'nombre' => 'Programa de Prueba',
        'estado' => 'activo',
    ]);

    $obraA = Obra::create([
        'programa_id' => $programa->id,
        'codigo' => 'OBR-A',
        'nombre' => 'Obra A',
        'estado' => 'ejecucion',
        'distrito' => 'El Tambo',
    ]);

    $obraB = Obra::create([
        'programa_id' => $programa->id,
        'codigo' => 'OBR-B',
        'nombre' => 'Obra B',
        'estado' => 'ejecucion',
        'distrito' => 'Chilca',
    ]);

    $obraC = Obra::create([
        'programa_id' => $programa->id,
        'codigo' => 'OBR-C',
        'nombre' => 'Obra Sin Acceso',
        'estado' => 'ejecucion',
        'distrito' => 'Huancayo',
    ]);

    $almacenA = Almacen::create([
        'obra_id' => $obraA->id,
        'codigo' => 'ALM-A',
        'nombre' => 'Almacén Obra A',
        'tipo' => 'principal',
        'activo' => true,
    ]);

    $usuario->obras()->attach([$obraA->id, $obraB->id]);

    return compact('usuario', 'obraA', 'obraB', 'obraC', 'almacenA');
}

test('el usuario autenticado fija su obra activa en la sesión', function () {
    ['usuario' => $usuario, 'obraA' => $obraA] = crearContextoOperativo();

    $response = $this->actingAs($usuario)
        ->from('/panel')
        ->post('/contexto', ['obra_activa_id' => $obraA->id]);

    $response->assertRedirect('/panel');
    $response->assertSessionHas('obra_activa_id', $obraA->id);
});

test('el usuario no puede activar una obra sin acceso', function () {
    ['usuario' => $usuario, 'obraC' => $obraC] = crearContextoOperativo();

    $response = $this->actingAs($usuario)
        ->from('/panel')
        ->post('/contexto', ['obra_activa_id' => $obraC->id]);

    $response->assertSessionHasErrors('obra_activa_id');
    $response->assertSessionMissing('obra_activa_id');
});

test('activar un almacén deriva la obra activa', function () {
    ['usuario' => $usuario, 'obraA' => $obraA, 'almacenA' => $almacenA] = crearContextoOperativo();

    $response = $this->actingAs($usuario)
        ->from('/panel')
        ->post('/contexto', ['almacen_activo_id' => $almacenA->id]);

    $response->assertRedirect('/panel');
    $response->assertSessionHas('obra_activa_id', $obraA->id);
    $response->assertSessionHas('almacen_activo_id', $almacenA->id);
});

test('un almacén que no pertenece a la obra activa es rechazado', function () {
    ['usuario' => $usuario, 'obraB' => $obraB, 'almacenA' => $almacenA] = crearContextoOperativo();

    $response = $this->actingAs($usuario)
        ->from('/panel')
        ->post('/contexto', [
            'obra_activa_id' => $obraB->id,
            'almacen_activo_id' => $almacenA->id,
        ]);

    $response->assertSessionHasErrors('almacen_activo_id');
});

test('un invitado no puede cambiar el contexto', function () {
    ['obraA' => $obraA] = crearContextoOperativo();

    $response = $this->from('/panel')->post('/contexto', ['obra_activa_id' => $obraA->id]);

    $response->assertRedirect('/login');
});
