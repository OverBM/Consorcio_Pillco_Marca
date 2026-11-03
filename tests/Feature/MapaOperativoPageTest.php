<?php

namespace Tests\Feature;

use App\Models\Almacen;
use App\Models\Obra;
use App\Models\Programa;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MapaOperativoPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_mapa_operativo_carga_con_datos_reales(): void
    {
        $usuario = Usuario::create([
            'name' => 'Jefe de Logística',
            'email' => 'jefe.mapa@pillcomarca.pe',
            'password' => bcrypt('secret123'),
            'activo' => true,
        ]);
        $this->actingAsConRol($usuario, 'jefe_logistica_compras');

        $this->get('/mapa-operativo')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('MapaOperativoPage')
                ->has('obrasDb')
                ->has('almacenesDb')
                ->has('rutasDb')
                ->has('despachosDb')
                ->has('alertasGeoDb')
                ->has('calorDb')
                ->has('cuotaRuteo')
                ->etc()
            );
    }

    public function test_obrero_no_accede_al_mapa_operativo(): void
    {
        $obrero = Usuario::create([
            'name' => 'Obrero',
            'email' => 'obrero.mapa@pillcomarca.pe',
            'password' => bcrypt('secret123'),
            'activo' => true,
        ]);
        $this->actingAsConRol($obrero, 'obrero_obra');

        $this->get('/mapa-operativo')->assertForbidden();
    }

    public function test_actualiza_radio_de_geocerca(): void
    {
        $usuario = Usuario::create([
            'name' => 'Administrador',
            'email' => 'admin.mapa@pillcomarca.pe',
            'password' => bcrypt('secret123'),
            'activo' => true,
        ]);
        $this->actingAsConRol($usuario);

        $programa = Programa::create([
            'codigo' => 'PRG-MAP',
            'nombre' => 'Programa Mapa',
            'estado' => 'activo',
        ]);
        $obra = Obra::create([
            'programa_id' => $programa->id,
            'codigo' => 'OBR-MAP',
            'nombre' => 'Obra Mapa',
            'estado' => 'ejecucion',
        ]);
        $almacen = Almacen::create([
            'obra_id' => $obra->id,
            'codigo' => 'ALM-MAP',
            'nombre' => 'Almacén Mapa',
            'radio_geocerca_m' => 150,
            'latitud' => -12.06,
            'longitud' => -75.21,
            'activo' => true,
        ]);

        $this->patchJson("/api/v1/geo/almacenes/{$almacen->id}", [
            'radio_geocerca_m' => 320,
            'lat' => -12.061,
            'lng' => -75.211,
        ])->assertOk()->assertJsonPath('data.radio_geocerca_m', 320);

        $this->assertDatabaseHas('almacenes', [
            'id' => $almacen->id,
            'radio_geocerca_m' => 320,
            'latitud' => -12.061,
            'longitud' => -75.211,
        ]);
    }

    public function test_rechaza_radio_invalido(): void
    {
        $usuario = Usuario::create([
            'name' => 'Administrador',
            'email' => 'admin.mapa2@pillcomarca.pe',
            'password' => bcrypt('secret123'),
            'activo' => true,
        ]);
        $this->actingAsConRol($usuario);

        $programa = Programa::create(['codigo' => 'PRG-MAP2', 'nombre' => 'Programa 2', 'estado' => 'activo']);
        $obra = Obra::create(['programa_id' => $programa->id, 'codigo' => 'OBR-MAP2', 'nombre' => 'Obra 2', 'estado' => 'ejecucion']);
        $almacen = Almacen::create([
            'obra_id' => $obra->id,
            'codigo' => 'ALM-MAP2',
            'nombre' => 'Almacén 2',
            'radio_geocerca_m' => 150,
            'latitud' => -12.06,
            'longitud' => -75.21,
            'activo' => true,
        ]);

        $this->patchJson("/api/v1/geo/almacenes/{$almacen->id}", [
            'radio_geocerca_m' => 5,
        ])->assertStatus(422);
    }
}
