<?php

use App\Models\Alerta;
use App\Models\AlertaLeida;
use App\Models\Notificacion;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('el feed fusiona notificaciones y alertas con el contador de pendientes', function () {
    $usuario = $this->usuarioConRol('obrero_obra');

    Notificacion::create([
        'usuario_id' => $usuario->id,
        'tipo' => 'requerimiento_registrado',
        'titulo' => 'Nuevo requerimiento',
        'cuerpo' => 'Pendiente de evaluación',
    ]);

    Notificacion::create([
        'usuario_id' => $usuario->id,
        'tipo' => 'stock_critico',
        'titulo' => 'Stock crítico',
        'cuerpo' => 'Cementos bajo mínimo',
    ]);

    Notificacion::create([
        'usuario_id' => $usuario->id,
        'tipo' => 'historica',
        'titulo' => 'Aviso antiguo',
        'cuerpo' => 'Ya leído',
        'leida_en' => now(),
    ]);

    Alerta::create([
        'tipo' => 'stock_bajo_minimo',
        'severidad' => 'alta',
        'mensaje' => 'Stock por debajo del mínimo',
        'estado' => 'abierta',
    ]);

    Alerta::create([
        'tipo' => 'transferencia_en_transito',
        'severidad' => 'media',
        'mensaje' => 'Transferencia demorada',
        'estado' => 'abierta',
    ]);

    $leida = Alerta::create([
        'tipo' => 'alerta_leida',
        'severidad' => 'baja',
        'mensaje' => 'Alerta ya revisada',
        'estado' => 'abierta',
    ]);

    AlertaLeida::create([
        'alerta_id' => $leida->id,
        'usuario_id' => $usuario->id,
        'leida_en' => now(),
    ]);

    $this->actingAs($usuario);

    $this->getJson('/api/v1/notificaciones')
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonCount(6, 'data.items')
        ->assertJsonPath('data.sin_leer', 4);

    $this->get('/panel')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('notificacionesFeed.sin_leer', 4)
            ->has('notificacionesFeed.items', 6)
            ->etc()
        );
});

test('marcar una notificación como leída actualiza el contador', function () {
    $usuario = $this->usuarioConRol('obrero_obra');

    $primera = Notificacion::create([
        'usuario_id' => $usuario->id,
        'tipo' => 'aviso',
        'titulo' => 'Aviso uno',
        'cuerpo' => 'Detalle uno',
    ]);

    $segunda = Notificacion::create([
        'usuario_id' => $usuario->id,
        'tipo' => 'aviso',
        'titulo' => 'Aviso dos',
        'cuerpo' => 'Detalle dos',
    ]);

    $this->actingAs($usuario);

    $this->postJson("/api/v1/notificaciones/{$primera->id}/marcar-leida")
        ->assertOk()
        ->assertJsonPath('data.sin_leer', 1);

    $this->assertNotNull($primera->fresh()->leida_en);
    $this->assertNull($segunda->fresh()->leida_en);

    $this->postJson('/api/v1/notificaciones/marcar-todas')
        ->assertOk()
        ->assertJsonPath('data.sin_leer', 0);

    $this->assertNotNull($segunda->fresh()->leida_en);
});

test('las alertas abiertas se marcan como leídas por usuario', function () {
    $usuario = $this->usuarioConRol('obrero_obra');

    $alerta = Alerta::create([
        'tipo' => 'stock_bajo_minimo',
        'severidad' => 'alta',
        'mensaje' => 'Stock crítico en almacén',
        'estado' => 'abierta',
    ]);

    $this->actingAs($usuario);

    $this->getJson('/api/v1/notificaciones')
        ->assertOk()
        ->assertJsonPath('data.sin_leer', 1);

    $this->postJson("/api/v1/alertas/{$alerta->id}/marcar-leida")
        ->assertOk()
        ->assertJsonPath('data.sin_leer', 0);

    $this->assertDatabaseHas('alerta_leida', [
        'alerta_id' => $alerta->id,
        'usuario_id' => $usuario->id,
    ]);
});

test('el feed requiere autenticación', function () {
    $this->getJson('/api/v1/notificaciones')->assertUnauthorized();
    $this->postJson('/api/v1/notificaciones/marcar-todas')->assertUnauthorized();
});
