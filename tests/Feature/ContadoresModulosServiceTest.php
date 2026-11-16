<?php

use App\Domain\Metricas\ContadoresModulosService;

test('calcula los contadores de todos los módulos sin romper la navegación', function () {
    $contadores = (new ContadoresModulosService)->contadores();

    expect($contadores)->toHaveKeys([
        'panel-general',
        'programa-redistribucion',
        'ciclo-vida',
        'matriz-stock',
        'requerimientos',
        'asistencia-geocerca',
        'observaciones-tecnicas',
        'solicitudes-acceso',
    ]);

    foreach ($contadores as $valor) {
        expect($valor)->toBeInt()->toBeGreaterThanOrEqual(0);
    }
});

test('los contadores reflejan registros reales de la base de datos', function () {
    $this->seed();

    $contadores = (new ContadoresModulosService)->contadores();

    expect(array_sum($contadores))->toBeGreaterThan(0);
});
