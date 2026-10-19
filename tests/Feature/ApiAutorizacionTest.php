<?php

use App\Models\Almacen;
use App\Models\CategoriaMaterial;
use App\Models\Material;
use App\Models\Obra;
use App\Models\Programa;
use App\Models\UnidadMedida;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * @return array{obra: Obra, almacen: Almacen, material: Material}
 */
function contextoAutorizacionApi(): array
{
    $programa = Programa::create([
        'nombre' => 'Programa Autorización',
        'estado' => 'activo',
    ]);

    $obra = Obra::create([
        'programa_id' => $programa->id,
        'codigo' => 'OBR-AUTH',
        'nombre' => 'Obra Autorización',
        'estado' => 'ejecucion',
        'distrito' => 'El Tambo',
    ]);

    $almacen = Almacen::create([
        'obra_id' => $obra->id,
        'codigo' => 'ALM-AUTH',
        'nombre' => 'Almacén Autorización',
        'tipo' => 'principal',
        'activo' => true,
    ]);

    $categoria = CategoriaMaterial::create(['nombre' => 'Aglomerantes']);

    $material = Material::create([
        'codigo' => 'MAT-AUTH',
        'nombre' => 'Cemento Portland Tipo I',
        'categoria_id' => $categoria->id,
        'unidad_id' => UnidadMedida::create([
            'codigo' => 'BOL',
            'nombre' => 'Bolsa',
        ])->id,
    ]);

    return compact('obra', 'almacen', 'material');
}

test('las lecturas públicas responden sin autenticación y las internas exigen identidad', function () {
    contextoAutorizacionApi();

    $this->getJson('/api/v1/proyectos')
        ->assertOk()
        ->assertJsonPath('success', true);

    $this->getJson('/api/v1/stock')->assertUnauthorized();
    $this->getJson('/api/v1/parametros')->assertUnauthorized();
    $this->getJson('/api/v1/proyectos/1')->assertUnauthorized();
});

test('las escrituras anónimas responden 401', function () {
    ['obra' => $obra, 'almacen' => $almacen, 'material' => $material] = contextoAutorizacionApi();

    $this->postJson('/api/v1/requerimientos', [
        'obra_id' => $obra->id,
        'almacen_id' => $almacen->id,
        'justificacion' => 'Compra de cemento para vaciado',
        'detalles' => [
            ['material_id' => $material->id, 'cantidad' => 10],
        ],
    ])->assertUnauthorized();
});

test('un usuario autenticado sin permiso de escritura recibe 403', function () {
    ['obra' => $obra, 'almacen' => $almacen, 'material' => $material] = contextoAutorizacionApi();

    $this->actingAs($this->usuarioConRol('obrero_obra'));

    $this->postJson('/api/v1/requerimientos', [
        'obra_id' => $obra->id,
        'almacen_id' => $almacen->id,
        'justificacion' => 'Compra de cemento para vaciado',
        'detalles' => [
            ['material_id' => $material->id, 'cantidad' => 10],
        ],
    ])->assertForbidden();
});

test('un usuario con permiso de escritura completa la operación', function () {
    ['obra' => $obra, 'almacen' => $almacen, 'material' => $material] = contextoAutorizacionApi();

    $this->actingAs($this->usuarioConRol('jefe_logistica_compras'));

    $this->postJson('/api/v1/requerimientos', [
        'obra_id' => $obra->id,
        'almacen_id' => $almacen->id,
        'justificacion' => 'Compra de cemento para vaciado',
        'detalles' => [
            ['material_id' => $material->id, 'cantidad' => 10],
        ],
    ])->assertCreated()
        ->assertJsonPath('success', true);

    $this->assertDatabaseCount('requerimientos', 1);
});

test('el token Bearer identifica al usuario en la API', function () {
    $usuario = Usuario::create([
        'name' => 'Cliente API',
        'email' => 'api@pillcomarca.pe',
        'password' => 'password123',
        'activo' => true,
    ]);

    $usuario->forceFill(['remember_token' => 'token-de-prueba'])->save();

    $this->getJson('/api/v1/parametros', [
        'Authorization' => 'Bearer token-de-prueba',
    ])->assertOk()
        ->assertJsonPath('success', true);
});
