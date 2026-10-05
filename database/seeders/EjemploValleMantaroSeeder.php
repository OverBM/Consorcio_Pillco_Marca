<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class EjemploValleMantaroSeeder extends Seeder
{
    public function run(): void
    {
        $isPgsql = DB::getDriverName() === 'pgsql';

        // 1. Programa Consorcial
        $programaId = DB::table('programas')->insertGetId([
            'nombre' => 'Programa de Infraestructura Educativa y Vial Valle del Mantaro',
            'descripcion' => 'Obras por contrata para la Municipalidad Distrital de Pillco Marca y Región Junín',
            'entidad_contratante' => 'Municipalidad Distrital de Pillco Marca',
            'estado' => 'activo',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 2. Obras
        if ($isPgsql) {
            DB::statement("
                INSERT INTO obras (programa_id, codigo, nombre, direccion, distrito, estado, fase_ciclo, avance_fisico_pct, presupuesto_base, ubicacion, created_at, updated_at)
                VALUES (
                    {$programaId}, 'OBR-01', 'IE Los Andes - Pabellón Secundario', 'Av. Ferrocarril 1230', 'Huancayo', 'ejecucion', 'ejecucion', 68.50, 1850000.00,
                    ST_SetSRID(ST_MakePoint(-75.2100, -12.0650), 4326)::geography, now(), now()
                )
            ");
            DB::statement("
                INSERT INTO obras (programa_id, codigo, nombre, direccion, distrito, estado, fase_ciclo, avance_fisico_pct, presupuesto_base, ubicacion, created_at, updated_at)
                VALUES (
                    {$programaId}, 'OBR-02', 'Mejoramiento Vial Av. Huancavelica', 'Av. Huancavelica cdra 18', 'El Tambo', 'ejecucion', 'ejecucion', 42.00, 2400000.00,
                    ST_SetSRID(ST_MakePoint(-75.2280, -12.0450), 4326)::geography, now(), now()
                )
            ");
            DB::statement("
                INSERT INTO obras (programa_id, codigo, nombre, direccion, distrito, estado, fase_ciclo, avance_fisico_pct, presupuesto_base, ubicacion, created_at, updated_at)
                VALUES (
                    {$programaId}, 'OBR-03', 'Complejo Recreacional y Deportivo Chilca', 'Jr. Real 450', 'Chilca', 'cerrada', 'cierre', 100.00, 1200000.00,
                    ST_SetSRID(ST_MakePoint(-75.2050, -12.0880), 4326)::geography, now(), now()
                )
            ");
        } else {
            DB::table('obras')->insert([
                [
                    'programa_id' => $programaId,
                    'codigo' => 'OBR-01',
                    'nombre' => 'IE Los Andes - Pabellón Secundario',
                    'direccion' => 'Av. Ferrocarril 1230',
                    'distrito' => 'Huancayo',
                    'estado' => 'ejecucion',
                    'fase_ciclo' => 'ejecucion',
                    'avance_fisico_pct' => 68.50,
                    'presupuesto_base' => 1850000.00,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'programa_id' => $programaId,
                    'codigo' => 'OBR-02',
                    'nombre' => 'Mejoramiento Vial Av. Huancavelica',
                    'direccion' => 'Av. Huancavelica cdra 18',
                    'distrito' => 'El Tambo',
                    'estado' => 'ejecucion',
                    'fase_ciclo' => 'ejecucion',
                    'avance_fisico_pct' => 42.00,
                    'presupuesto_base' => 2400000.00,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'programa_id' => $programaId,
                    'codigo' => 'OBR-03',
                    'nombre' => 'Complejo Recreacional y Deportivo Chilca',
                    'direccion' => 'Jr. Real 450',
                    'distrito' => 'Chilca',
                    'estado' => 'cerrada',
                    'fase_ciclo' => 'cierre',
                    'avance_fisico_pct' => 100.00,
                    'presupuesto_base' => 1200000.00,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ]);
        }

        $obra1Id = DB::table('obras')->where('codigo', 'OBR-01')->value('id');
        $obra2Id = DB::table('obras')->where('codigo', 'OBR-02')->value('id');
        $obra3Id = DB::table('obras')->where('codigo', 'OBR-03')->value('id');

        // 3. Almacenes
        if ($isPgsql) {
            DB::statement("
                INSERT INTO almacenes (obra_id, codigo, nombre, radio_geocerca_m, capacidad_referencial, activo, ubicacion, created_at, updated_at)
                VALUES (
                    {$obra1Id}, 'ALM-01', 'Almacén Central IE Los Andes', 150, 5000.00, true,
                    ST_SetSRID(ST_MakePoint(-75.2102, -12.0652), 4326)::geography, now(), now()
                )
            ");
            DB::statement("
                INSERT INTO almacenes (obra_id, codigo, nombre, radio_geocerca_m, capacidad_referencial, activo, ubicacion, created_at, updated_at)
                VALUES (
                    {$obra2Id}, 'ALM-02', 'Almacén de Obra El Tambo', 180, 8000.00, true,
                    ST_SetSRID(ST_MakePoint(-75.2285, -12.0455), 4326)::geography, now(), now()
                )
            ");
            DB::statement("
                INSERT INTO almacenes (obra_id, codigo, nombre, radio_geocerca_m, capacidad_referencial, activo, ubicacion, created_at, updated_at)
                VALUES (
                    {$obra3Id}, 'ALM-03', 'Almacén Satélite Chilca (Liquidación)', 120, 3000.00, true,
                    ST_SetSRID(ST_MakePoint(-75.2052, -12.0882), 4326)::geography, now(), now()
                )
            ");
        } else {
            DB::table('almacenes')->insert([
                [
                    'obra_id' => $obra1Id,
                    'codigo' => 'ALM-01',
                    'nombre' => 'Almacén Central IE Los Andes',
                    'radio_geocerca_m' => 150,
                    'capacidad_referencial' => 5000.00,
                    'activo' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'obra_id' => $obra2Id,
                    'codigo' => 'ALM-02',
                    'nombre' => 'Almacén de Obra El Tambo',
                    'radio_geocerca_m' => 180,
                    'capacidad_referencial' => 8000.00,
                    'activo' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'obra_id' => $obra3Id,
                    'codigo' => 'ALM-03',
                    'nombre' => 'Almacén Satélite Chilca (Liquidación)',
                    'radio_geocerca_m' => 120,
                    'capacidad_referencial' => 3000.00,
                    'activo' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ]);
        }

        $alm1Id = DB::table('almacenes')->where('codigo', 'ALM-01')->value('id');
        $alm2Id = DB::table('almacenes')->where('codigo', 'ALM-02')->value('id');
        $alm3Id = DB::table('almacenes')->where('codigo', 'ALM-03')->value('id');

        // 4. Catálogo de Materiales
        $catCemento = DB::table('categorias_material')->where('nombre', 'Cementos y aglomerantes')->value('id');
        $catAcero = DB::table('categorias_material')->where('nombre', 'Acero y fierro')->value('id');
        $catAgregados = DB::table('categorias_material')->where('nombre', 'Agregados')->value('id');
        $catEpp = DB::table('categorias_material')->where('nombre', 'EPP')->value('id');

        $undBolsa = DB::table('unidades_medida')->where('codigo', 'bls')->value('id');
        $undVarilla = DB::table('unidades_medida')->where('codigo', 'var')->value('id');
        $undM3 = DB::table('unidades_medida')->where('codigo', 'm3')->value('id');
        $undUnidad = DB::table('unidades_medida')->where('codigo', 'und')->value('id');

        $matCementoAndino = DB::table('materiales')->insertGetId([
            'codigo' => 'MAT-CEM-01',
            'nombre' => 'Cemento Andino Tipo V (Resistente a sulfatos)',
            'categoria_id' => $catCemento,
            'unidad_id' => $undBolsa,
            'criticidad' => 'critica',
            'costo_referencial' => 32.50,
            'especificaciones' => json_encode(['norma' => 'NTP 334.090', 'resistencia' => 'Tipo V', 'peso_kg' => 42.5]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $matFierroMedia = DB::table('materiales')->insertGetId([
            'codigo' => 'MAT-ACE-01',
            'nombre' => 'Fierro Corrugado 1/2" Grado 60 SIDERPERU',
            'categoria_id' => $catAcero,
            'unidad_id' => $undVarilla,
            'criticidad' => 'alta',
            'costo_referencial' => 48.00,
            'especificaciones' => json_encode(['norma' => 'ASTM A615', 'longitud_m' => 9.0]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $matArenaGruesa = DB::table('materiales')->insertGetId([
            'codigo' => 'MAT-AGR-01',
            'nombre' => 'Arena Gruesa de Río seleccionada',
            'categoria_id' => $catAgregados,
            'unidad_id' => $undM3,
            'criticidad' => 'normal',
            'costo_referencial' => 65.00,
            'especificaciones' => json_encode(['origen' => 'Cantera Mantaro']),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $matCascoSeguridad = DB::table('materiales')->insertGetId([
            'codigo' => 'MAT-EPP-01',
            'nombre' => 'Casco de Seguridad Dieléctrico Tipo I Clase E',
            'categoria_id' => $catEpp,
            'unidad_id' => $undUnidad,
            'criticidad' => 'alta',
            'es_epp' => true,
            'requiere_serie' => true,
            'costo_referencial' => 38.00,
            'especificaciones' => json_encode(['norma' => 'ANSI Z89.1-2014']),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 5. Stock de Almacén
        // Almacén 1 (Los Andes): Stock Normal
        DB::table('stock_almacen')->insert([
            'almacen_id' => $alm1Id,
            'material_id' => $matCementoAndino,
            'cantidad' => 120.00,
            'cantidad_reservada' => 0.00,
            'stock_minimo' => 50.00,
            'stock_seguridad' => 20.00,
            'punto_reorden' => 60.00,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Almacén 2 (El Tambo): DÉFICIT CRÍTICO (por debajo del mínimo)
        DB::table('stock_almacen')->insert([
            'almacen_id' => $alm2Id,
            'material_id' => $matCementoAndino,
            'cantidad' => 15.00,
            'cantidad_reservada' => 0.00,
            'stock_minimo' => 80.00,
            'stock_seguridad' => 30.00,
            'punto_reorden' => 100.00,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Almacén 3 (Chilca - Obra Cerrada): EXCEDENTE DISPONIBLE (150 bolsas sobrantes)
        DB::table('stock_almacen')->insert([
            'almacen_id' => $alm3Id,
            'material_id' => $matCementoAndino,
            'cantidad' => 150.00,
            'cantidad_reservada' => 0.00,
            'stock_minimo' => 0.00,
            'stock_seguridad' => 0.00,
            'punto_reorden' => 0.00,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 6. Registro de Excedente Detectado
        DB::table('excedentes_detectados')->insert([
            'obra_origen_id' => $obra3Id,
            'almacen_id' => $alm3Id,
            'material_id' => $matCementoAndino,
            'cantidad' => 150.00,
            'origen' => 'cierre_obra',
            'estado' => 'sugerido',
            'detectado_en' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
