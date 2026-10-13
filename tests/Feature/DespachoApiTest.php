<?php

use App\Models\Almacen;
use App\Models\Despacho;
use App\Models\Obra;
use App\Models\Programa;
use App\Models\Transferencia;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('el endpoint de despachos lista los despachos con su transferencia y almacenes', function () {
    $usuario = Usuario::create([
        'name' => 'Almacenero de Prueba',
        'email' => 'almacen@pillcomarca.pe',
        'password' => bcrypt('secret123'),
        'activo' => true,
    ]);

    $programa = Programa::create([
        'nombre' => 'Programa de Prueba',
        'estado' => 'activo',
    ]);

    $obra = Obra::create([
        'programa_id' => $programa->id,
        'codigo' => 'OBR-DESP',
        'nombre' => 'Obra de Despacho',
        'estado' => 'ejecucion',
        'distrito' => 'El Tambo',
    ]);

    $origen = Almacen::create([
        'obra_id' => $obra->id,
        'codigo' => 'ALM-ORI',
        'nombre' => 'Almacén Origen',
        'tipo' => 'principal',
        'activo' => true,
    ]);

    $destino = Almacen::create([
        'obra_id' => $obra->id,
        'codigo' => 'ALM-DES',
        'nombre' => 'Almacén Destino',
        'tipo' => 'satelite',
        'activo' => true,
    ]);

    $transferencia = Transferencia::create([
        'codigo' => 'TRF-TEST-01',
        'almacen_origen_id' => $origen->id,
        'almacen_destino_id' => $destino->id,
        'motivo' => 'redistribucion',
        'estado' => 'en_transito',
    ]);

    Despacho::create([
        'transferencia_id' => $transferencia->id,
        'despachado_por' => $usuario->id,
        'despachado_en' => now(),
        'observaciones' => 'Salida de prueba',
    ]);

    $response = $this->getJson('/api/v1/despachos');

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.transferencia.codigo', 'TRF-TEST-01')
        ->assertJsonPath('data.0.transferencia.almacen_origen.nombre', 'Almacén Origen')
        ->assertJsonPath('data.0.transferencia.almacen_destino.nombre', 'Almacén Destino');
});
