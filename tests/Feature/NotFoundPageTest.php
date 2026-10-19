<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('una ruta web inexistente renderiza la pantalla 404 de Inertia', function () {
    $response = $this->get('/ruta-que-no-existe');

    $response->assertStatus(404);
    $response->assertInertia(fn (Assert $page) => $page->component('errors/NotFound'));
});

test('una ruta de la API inexistente responde JSON 404 y no la pantalla Inertia', function () {
    $response = $this->getJson('/api/v1/ruta-que-no-existe');

    $response->assertStatus(404);
    $response->assertJsonStructure(['message']);
    $response->assertHeaderMissing('X-Inertia');
});
