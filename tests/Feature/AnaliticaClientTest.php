<?php

use App\Domain\Analitica\AnaliticaClient;
use Illuminate\Support\Facades\Http;

test('envía el payload al motor predictivo y devuelve la respuesta validada', function () {
    Http::fake([
        '*/v1/pipeline' => Http::response([
            'parametros' => [['material_id' => 1]],
            'pronosticos' => [['cantidad' => 12.5]],
        ]),
    ]);

    $resultado = (new AnaliticaClient)->pipeline(['materiales' => [1]]);

    expect($resultado)->toHaveKeys(['parametros', 'pronosticos']);
    Http::assertSent(fn ($request): bool => $request->hasHeader('X-Internal-Token', 'dev-token')
        && $request->url() === 'http://127.0.0.1:8001/v1/pipeline');
});

test('lanza excepción cuando el motor responde con error', function () {
    Http::fake([
        '*/v1/pipeline' => Http::response(['message' => 'boom'], 500),
    ]);

    expect(fn () => (new AnaliticaClient)->pipeline([]))
        ->toThrow(RuntimeException::class);
});

test('lanza excepción cuando la respuesta no tiene la estructura esperada', function () {
    Http::fake([
        '*/v1/pipeline' => Http::response(['parametros' => []], 200),
    ]);

    expect(fn () => (new AnaliticaClient)->pipeline([]))
        ->toThrow(RuntimeException::class);
});

test('informa disponibilidad según el health check', function () {
    Http::fake([
        '*/health' => Http::sequence()
            ->push(['status' => 'ok'], 200)
            ->push([], 503),
    ]);

    $cliente = new AnaliticaClient;

    expect($cliente->disponible())->toBeTrue();
    expect($cliente->disponible())->toBeFalse();
});
