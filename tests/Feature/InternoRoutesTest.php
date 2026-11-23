<?php

use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('los endpoints internos rechazan un token incorrecto', function () {
    config(['app.schedule_token' => 'token-de-prueba']);

    $this->get('/interno/schedule/otro-token')->assertNotFound();
    $this->get('/interno/analitica/otro-token')->assertNotFound();
});

test('los endpoints internos no existen sin token configurado', function () {
    config(['app.schedule_token' => null]);

    $this->get('/interno/schedule/cualquier-token')->assertNotFound();
    $this->get('/interno/analitica/cualquier-token')->assertNotFound();
});
