<?php

use App\Support\EstadoCatalogo;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

it('tiene valores canónicos para cada columna del catálogo', function () {
    foreach (EstadoCatalogo::todas() as $clave => $valores) {
        expect($valores)->not->toBeEmpty("El catálogo {$clave} no tiene valores.");
        expect(array_unique($valores))->toHaveCount(count($valores), "El catálogo {$clave} contiene duplicados.");
    }
});

it('incluye el estado sugerida que usa la UI de transferencias', function () {
    expect(EstadoCatalogo::valores('transferencias', 'estado'))->toContain('sugerida');

    $page = File::get(resource_path('js/pages/TransferenciasPage.tsx'));

    expect($page)->toContain('sugerida: { tone:');
});

it('cubre las columnas de estado del esquema PostgreSQL', function () {
    if (DB::getDriverName() !== 'pgsql') {
        $this->markTestSkipped('La verificación del catálogo requiere PostgreSQL.');
    }

    $columnas = DB::select("
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND (
            column_name LIKE '%estado%'
            OR column_name LIKE '%tipo%'
            OR column_name LIKE '%severidad%'
            OR column_name LIKE '%criticidad%'
            OR column_name LIKE '%destino%'
            OR column_name LIKE '%clase%'
          )
          AND data_type IN ('character varying', 'text')
        ORDER BY table_name, column_name
    ");

    $excepciones = [
        'auditorias.accion',
        'documentos.tipo',
        'documentos.documentable_type',
        'kardex.tipo_movimiento',
        'kardex.documento_tipo',
        'notificaciones.tipo',
        'alertas.tipo',
        'alertas.referencia_tipo',
        'incidentes.tipo',
        'riesgos.categoria',
        'riesgos.origen',
        'residuos.descripcion',
        'solicitudes.justificacion',
        'parametros_sistema.descripcion',
        'transferencias.motivo',
        'parametros_inventario.origen',
        'ejecuciones_analitica.origen',
    ];

    $faltantes = [];

    foreach ($columnas as $columna) {
        $clave = $columna->table_name.'.'.$columna->column_name;

        if (in_array($clave, $excepciones, true)) {
            continue;
        }

        if (EstadoCatalogo::valores($columna->table_name, $columna->column_name) === []) {
            $faltantes[] = $clave;
        }
    }

    expect($faltantes)->toBe([], 'Columnas de estado sin catálogo: '.implode(', ', $faltantes));
});
