<?php

use App\Support\CatalogoModulos;

test('encuentra un módulo por su título exacto sin distinguir acentos', function () {
    $resultados = CatalogoModulos::buscar('mermas', ['logistica.ver']);

    expect($resultados)->not->toBeEmpty();
    expect($resultados[0]['href'])->toBe('/mermas');
});

test('resuelve alias y sinónimos del catálogo', function () {
    $resultados = CatalogoModulos::buscar('kpi', ['panel.ver']);

    expect($resultados[0]['titulo'])->toBe('Reportes e Indicadores');
});

test('respeta los permisos del usuario', function () {
    $sinPermiso = CatalogoModulos::buscar('usuarios', []);
    $conPermiso = CatalogoModulos::buscar('usuarios', ['admin.ver']);

    expect($sinPermiso)->toBeEmpty();
    expect($conPermiso)->not->toBeEmpty();
});

test('normaliza mayúsculas, acentos y espacios repetidos', function () {
    expect(CatalogoModulos::normalizar('  ANALÍTICA   Predictiva '))
        ->toBe('analitica predictiva');
});

test('devuelve vacío para términos en blanco y respeta el límite', function () {
    expect(CatalogoModulos::buscar('   ', ['panel.ver']))->toBeEmpty();
    expect(CatalogoModulos::buscar('a', ['admin.ver'], 3))->toHaveCount(3);
});
