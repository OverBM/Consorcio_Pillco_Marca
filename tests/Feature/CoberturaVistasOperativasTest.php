<?php

use Illuminate\Support\Facades\Http;

test('las vistas operativas responden con el rol administrador', function (string $ruta) {
    $this->seed();

    $this->actingAsConRol($this->usuarioConRol())
        ->get($ruta)
        ->assertOk();
})->with([
    '/stock',
    '/recepcion',
    '/solicitudes',
    '/despachos',
    '/transferencias',
    '/inventario-fisico',
    '/mermas',
    '/compras',
    '/compras/requerimientos',
    '/compras/cotizaciones',
    '/compras/ordenes-compra',
    '/compras/proveedores',
    '/compras/devoluciones',
    '/personal/asistencia',
    '/personal/planillas',
    '/personal/capacitaciones',
    '/sst/incidentes',
    '/sst/epp',
    '/calidad/observaciones',
    '/ambiente/monitoreo',
    '/ambiente/residuos',
    '/mapa-operativo',
    '/analitica',
    '/programa',
    '/gestion-obra/ciclo-vida',
    '/gestion-obra/partidas',
    '/gestion-obra/cronograma-evm',
    '/gestion-obra/valorizaciones',
    '/gestion-obra/riesgos',
    '/gestion-obra/cambios',
    '/gestion-obra/cierre',
    '/finanzas/presupuesto',
    '/finanzas/adelantos',
    '/admin/usuarios',
    '/admin/auditoria',
    '/admin/parametros',
    '/admin/fases',
    '/admin/solicitudes',
]);

test('la API de proveedores, devoluciones, reportes y analítica responde', function () {
    $this->seed();

    $usuario = $this->usuarioConRol();

    $this->actingAsConRol($usuario)->getJson('/api/v1/proveedores')->assertOk();
    $this->actingAsConRol($usuario)->getJson('/api/v1/devoluciones')->assertOk();
    $this->actingAsConRol($usuario)->getJson('/api/v1/geo/reporte')->assertOk();
    $this->actingAsConRol($usuario)->getJson('/api/v1/analitica/resumen')->assertOk();
    $this->actingAsConRol($usuario)->getJson('/api/v1/analitica/redistribucion')->assertOk();
});

test('la API de geolocalización usa el proveedor externo y devuelve coordenadas', function () {
    Http::fake([
        'api.openrouteservice.org/*' => Http::response([
            'features' => [[
                'geometry' => ['coordinates' => [-75.2046, -12.0651]],
                'properties' => ['label' => 'Huancayo, Junín, Perú', 'confidence' => 0.92],
            ]],
        ]),
    ]);

    $usuario = $this->usuarioConRol();

    $this->actingAsConRol($usuario)
        ->postJson('/api/v1/geo/geocodificar', ['direccion' => 'Huancayo, Junín'])
        ->assertOk()
        ->assertJsonPath('data.etiqueta', 'Huancayo, Junín, Perú');

    $this->actingAsConRol($usuario)
        ->getJson('/api/v1/geo/reversa?lat=-12.0651&lng=-75.2046')
        ->assertOk();

    $this->actingAsConRol($usuario)
        ->getJson('/api/v1/geo/sugerencias?q=Huancayo')
        ->assertOk()
        ->assertJsonCount(1, 'data');
});

test('la API de geolocalización responde 422 cuando el proveedor falla', function () {
    Http::fake([
        'api.openrouteservice.org/*' => Http::response([], 500),
    ]);

    $usuario = $this->usuarioConRol();

    $this->actingAsConRol($usuario)
        ->postJson('/api/v1/geo/geocodificar', ['direccion' => 'Dirección inexistente'])
        ->assertStatus(422);

    $this->actingAsConRol($usuario)
        ->getJson('/api/v1/geo/reversa?lat=-12.1&lng=-75.2')
        ->assertStatus(422);
});
