<?php

test('la landing monta el hero 3D y ya no carga el video', function () {
    $response = $this->get('/');

    $response->assertOk();
    $response->assertSee('id="landing-hero"', false);
    $response->assertSee('/assets/hero-building-poster.png', false);
    $response->assertDontSee('hero.mp4', false);
    $response->assertDontSee('hero-video', false);
    $response->assertSee('landing-hero', false);
});

test('el póster del hero existe y respeta el presupuesto', function () {
    $poster = public_path('assets/hero-building-poster.png');

    expect(file_exists($poster))->toBeTrue();
    expect(filesize($poster))->toBeLessThan(120 * 1024);
    expect(file_exists(public_path('assets/hero.mp4')))->toBeFalse();
});

test('el bundle del hero está en el manifiesto de Vite', function () {
    $manifestPath = public_path('build/manifest.json');

    expect(file_exists($manifestPath))->toBeTrue();

    $manifest = json_decode(file_get_contents($manifestPath), true);
    $entry = $manifest['resources/js/landing-hero.tsx'] ?? null;

    expect($entry)->not->toBeNull();
    expect(file_exists(public_path('build/'.$entry['file'])))->toBeTrue();
});
