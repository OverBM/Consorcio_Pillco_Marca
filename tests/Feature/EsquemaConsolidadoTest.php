<?php

use Illuminate\Support\Facades\DB;

it('deja el esquema consolidado sin tablas retiradas ni FKs sin índice', function () {
    if (DB::getDriverName() !== 'pgsql') {
        $this->markTestSkipped('La verificación del esquema requiere PostgreSQL.');
    }

    $tablas = DB::select("
        SELECT c.relname AS table_name
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r'
    ");

    $nombres = array_column($tablas, 'table_name');

    expect(count($nombres))->toBeGreaterThanOrEqual(80)->toBeLessThanOrEqual(82);

    $retiradas = [
        'acciones_correctivas', 'busquedas_multialmacen', 'busqueda_resultados',
        'capacitacion_participantes', 'certificaciones_usuario', 'comunicaciones',
        'interesados', 'epp_solicitudes', 'equipos', 'lecciones_aprendidas',
        'partida_materiales', 'plan_manejo_items', 'plan_manejo_verificaciones',
        'alerta_leida', 'alertas_abastecimiento', 'alertas_geoespaciales',
        'despachos', 'confirmaciones_recepcion_destino', 'cierres_obra',
        'solicitudes_material', 'requerimientos',
    ];

    foreach ($retiradas as $tabla) {
        expect($nombres)->not->toContain($tabla);
    }

    foreach (['solicitudes', 'solicitud_detalles', 'personas', 'transferencia_posiciones'] as $tabla) {
        expect($nombres)->toContain($tabla);
    }

    $fksSinIndice = DB::select(<<<'SQL'
        WITH fks AS (
            SELECT con.oid, con.conrelid, con.conname, con.conkey
            FROM pg_constraint con
            JOIN pg_class src ON src.oid = con.conrelid
            JOIN pg_namespace n ON n.oid = src.relnamespace AND n.nspname = 'public'
            WHERE con.contype = 'f'
        )
        SELECT src.relname AS table_name, f.conname
        FROM fks f
        JOIN pg_class src ON src.oid = f.conrelid
        WHERE NOT EXISTS (
            SELECT 1 FROM pg_index i
            WHERE i.indrelid = f.conrelid AND i.indisvalid
              AND (i.indkey::int2[])[0:array_length(f.conkey, 1) - 1] = f.conkey
        )
    SQL);

    expect($fksSinIndice)->toBe([], 'FKs sin índice: '.implode(', ', array_map(
        fn ($fila) => $fila->table_name.'.'.$fila->conname,
        $fksSinIndice,
    )));
});

it('cubre las columnas geography con GiST y no duplica umbrales de stock', function () {
    if (DB::getDriverName() !== 'pgsql') {
        $this->markTestSkipped('La verificación del esquema requiere PostgreSQL.');
    }

    $geografias = DB::select("
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND udt_name = 'geography'
    ");

    foreach ($geografias as $columna) {
        $indice = DB::selectOne(
            "SELECT 1 FROM pg_indexes
             WHERE schemaname = 'public' AND tablename = ?
               AND indexdef ILIKE '%USING gist%' AND indexdef ILIKE ?",
            [$columna->table_name, '%'.$columna->column_name.'%'],
        );

        expect($indice)->not->toBeNull("Falta GiST en {$columna->table_name}.{$columna->column_name}");
    }

    $duplicadas = DB::select("
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND column_name IN ('stock_seguridad', 'punto_reorden')
          AND table_name <> 'stock_almacen'
    ");

    expect($duplicadas)->toBe([]);
});

it('tiene el CHECK compuesto de solicitudes y comentarios de esquema', function () {
    if (DB::getDriverName() !== 'pgsql') {
        $this->markTestSkipped('La verificación del esquema requiere PostgreSQL.');
    }

    $check = DB::selectOne(
        "SELECT 1 FROM pg_constraint WHERE conname = 'chk_solicitudes_tipo_estado' AND connamespace = 'public'::regnamespace"
    );

    expect($check)->not->toBeNull();

    $comentadas = DB::selectOne("
        SELECT count(*) AS total
        FROM pg_description d
        JOIN pg_class c ON c.oid = d.objoid
        JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
        WHERE c.relkind = 'r' AND d.objsubid = 0
    ");

    expect((int) $comentadas->total)->toBeGreaterThanOrEqual(80);
});
