<?php

use Illuminate\Support\Facades\DB;

test('un visitante anónimo abre el hub sin props de Inertia', function () {
    $response = $this->get('/como-trabajamos');

    $response->assertOk();
    $response->assertSee('id="como-trabajamos-app"', false);
    $response->assertSee('Cómo trabajamos', false);
    $response->assertDontSee('data-page=', false);
    $response->assertDontSee('avance_real', false);
    $response->assertDontSee('stock_almacen', false);
});

test('el hub público no ejecuta consultas a la base de datos', function () {
    DB::flushQueryLog();
    DB::enableQueryLog();

    $this->get('/como-trabajamos')->assertOk();

    expect(DB::getQueryLog())->toBeEmpty();

    DB::disableQueryLog();
});

test('el hub no carga recursos de CDNs externos', function () {
    $html = $this->get('/como-trabajamos')->getContent();

    preg_match_all('#https?://([^/"\s]+)#', $html, $coincidencias);

    $externos = collect($coincidencias[1] ?? [])
        ->map(fn (string $host) => explode(':', $host)[0])
        ->reject(fn (string $host) => in_array($host, [
            '127.0.0.1',
            'localhost',
            '[::1]',
        ], true))
        ->unique()
        ->values();

    expect($externos)->toBeEmpty();
});

test('la isla 3D respeta el presupuesto de peso gzip', function () {
    $manifestPath = public_path('build/manifest.json');

    expect(file_exists($manifestPath))->toBeTrue();

    $manifest = json_decode(file_get_contents($manifestPath), true);
    $entry = $manifest['resources/js/como-trabajamos.tsx'] ?? null;

    expect($entry)->not->toBeNull();

    $archivo = public_path('build/'.$entry['file']);

    expect(file_exists($archivo))->toBeTrue();
    expect(strlen(gzencode(file_get_contents($archivo), 9)))->toBeLessThan(
        320 * 1024,
    );
});
