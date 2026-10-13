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
        $excedenteId = DB::table('excedentes_detectados')->insertGetId([
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

        // 7. Usuarios de referencia (creados por RolesSeeder)
        $residenteId = DB::table('usuarios')->where('email', 'residente.chupaca@pillcomarca.pe')->value('id');
        $logisticaId = DB::table('usuarios')->where('email', 'logistica@pillcomarca.pe')->value('id');
        $almaceneroId = DB::table('usuarios')->where('email', 'almacen.central@pillcomarca.pe')->value('id');
        $gerenteId = DB::table('usuarios')->where('email', 'gerencia@pillcomarca.pe')->value('id');

        // 8. Frentes de trabajo
        $frente1Id = DB::table('frentes_trabajo')->insertGetId([
            'obra_id' => $obra1Id, 'nombre' => 'Frente Pabellón A', 'maestro_obra_id' => null,
            'estado' => 'activo', 'created_at' => now(), 'updated_at' => now(),
        ]);
        $frente2Id = DB::table('frentes_trabajo')->insertGetId([
            'obra_id' => $obra1Id, 'nombre' => 'Frente Patio y Cerco', 'maestro_obra_id' => null,
            'estado' => 'activo', 'created_at' => now(), 'updated_at' => now(),
        ]);
        $frente3Id = DB::table('frentes_trabajo')->insertGetId([
            'obra_id' => $obra2Id, 'nombre' => 'Frente Vía Principal', 'maestro_obra_id' => null,
            'estado' => 'activo', 'created_at' => now(), 'updated_at' => now(),
        ]);

        // 9. Ubicaciones de almacén
        DB::table('ubicaciones_almacen')->insert([
            ['almacen_id' => $alm1Id, 'codigo' => 'A-01', 'descripcion' => 'Zona de cemento'],
            ['almacen_id' => $alm1Id, 'codigo' => 'A-02', 'descripcion' => 'Zona de acero'],
            ['almacen_id' => $alm2Id, 'codigo' => 'B-01', 'descripcion' => 'Zona de agregados'],
            ['almacen_id' => $alm3Id, 'codigo' => 'C-01', 'descripcion' => 'Zona de liquidación'],
        ]);

        // 10. Partidas y su lista de materiales
        $partidas = [
            ['obra_id' => $obra1Id, 'frente_id' => $frente1Id, 'codigo' => 'P-01', 'descripcion' => 'Concreto estructural f\'c=210', 'unidad' => 'm3', 'metrado' => 450.00, 'costo_unitario' => 380.00, 'avance_pct' => 72.00],
            ['obra_id' => $obra1Id, 'frente_id' => $frente1Id, 'codigo' => 'P-02', 'descripcion' => 'Acero de refuerzo fy=4200', 'unidad' => 'kg', 'metrado' => 28000.00, 'costo_unitario' => 4.80, 'avance_pct' => 65.00],
            ['obra_id' => $obra1Id, 'frente_id' => $frente2Id, 'codigo' => 'P-03', 'descripcion' => 'Muros y tabiques de albañilería', 'unidad' => 'm2', 'metrado' => 980.00, 'costo_unitario' => 95.00, 'avance_pct' => 58.00],
            ['obra_id' => $obra2Id, 'frente_id' => $frente3Id, 'codigo' => 'P-01', 'descripcion' => 'Movimiento de tierras y corte', 'unidad' => 'm3', 'metrado' => 12000.00, 'costo_unitario' => 22.00, 'avance_pct' => 45.00],
            ['obra_id' => $obra2Id, 'frente_id' => $frente3Id, 'codigo' => 'P-02', 'descripcion' => 'Base granular y pavimento', 'unidad' => 'm2', 'metrado' => 8600.00, 'costo_unitario' => 78.00, 'avance_pct' => 30.00],
        ];

        $partidaIds = [];

        foreach ($partidas as $p) {
            $partidaIds[$p['obra_id']][$p['codigo']] = DB::table('partidas')->insertGetId($p + [
                'fecha_inicio_prevista' => '2026-03-01',
                'fecha_fin_prevista' => '2026-11-30',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $partidaConcreto = $partidaIds[$obra1Id]['P-01'];
        $partidaAcero = $partidaIds[$obra1Id]['P-02'];
        $partidaMuros = $partidaIds[$obra1Id]['P-03'];
        $partidaTierras = $partidaIds[$obra2Id]['P-01'];
        $partidaPavimento = $partidaIds[$obra2Id]['P-02'];

        DB::table('partida_materiales')->insert([
            ['partida_id' => $partidaConcreto, 'material_id' => $matCementoAndino, 'cantidad_por_unidad' => 9.50000],
            ['partida_id' => $partidaConcreto, 'material_id' => $matArenaGruesa, 'cantidad_por_unidad' => 0.55000],
            ['partida_id' => $partidaAcero, 'material_id' => $matFierroMedia, 'cantidad_por_unidad' => 1.00000],
            ['partida_id' => $partidaMuros, 'material_id' => $matCementoAndino, 'cantidad_por_unidad' => 0.45000],
            ['partida_id' => $partidaTierras, 'material_id' => $matCascoSeguridad, 'cantidad_por_unidad' => 0.00100],
        ]);

        // 11. Proveedores
        $prov1Id = DB::table('proveedores')->insertGetId([
            'ruc' => '20123456789', 'razon_social' => 'Ferretería y Materiales del Centro S.A.C.',
            'contacto' => 'Jorge Salas', 'telefono' => '064481234', 'email' => 'ventas@matcentro.pe',
            'direccion' => 'Av. Giráldez 850, Huancayo', 'calificacion' => 4.60, 'activo' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $prov2Id = DB::table('proveedores')->insertGetId([
            'ruc' => '20987654321', 'razon_social' => 'Aceros Andinos E.I.R.L.',
            'contacto' => 'Rosa Carhuapoma', 'telefono' => '064445566', 'email' => 'cotizaciones@acerosandinos.pe',
            'direccion' => 'Parque Industrial, El Tambo', 'calificacion' => 4.20, 'activo' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $prov3Id = DB::table('proveedores')->insertGetId([
            'ruc' => '20456789123', 'razon_social' => 'Agregados Mantaro Transportes S.R.L.',
            'contacto' => 'Pedro Huamán', 'telefono' => '964778811', 'email' => 'logistica@agregadosmantaro.pe',
            'direccion' => 'Cantera San Jerónimo, Huancayo', 'calificacion' => 3.90, 'activo' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        // 12. Requerimientos y sus cotizaciones / órdenes de compra
        $req1Id = DB::table('requerimientos')->insertGetId([
            'codigo' => 'REQ-2026-001', 'obra_id' => $obra1Id, 'almacen_id' => $alm1Id,
            'partida_id' => $partidaConcreto, 'solicitante_id' => $residenteId,
            'prioridad' => 'alta', 'estado' => 'aprobado',
            'justificacion' => 'Vaciado de losa del pabellón secundario.',
            'fecha_requerida' => '2026-09-15', 'aprobado_por' => $gerenteId, 'aprobado_en' => now()->subDays(12),
            'created_at' => now()->subDays(14), 'updated_at' => now()->subDays(12),
        ]);
        DB::table('requerimiento_detalles')->insert([
            ['requerimiento_id' => $req1Id, 'material_id' => $matCementoAndino, 'cantidad' => 400.000, 'cantidad_atendida' => 400.000],
            ['requerimiento_id' => $req1Id, 'material_id' => $matArenaGruesa, 'cantidad' => 25.000, 'cantidad_atendida' => 25.000],
        ]);

        $req2Id = DB::table('requerimientos')->insertGetId([
            'codigo' => 'REQ-2026-002', 'obra_id' => $obra1Id, 'almacen_id' => $alm1Id,
            'partida_id' => $partidaAcero, 'solicitante_id' => $residenteId,
            'prioridad' => 'normal', 'estado' => 'borrador',
            'justificacion' => 'Reposición de acero para columnas.',
            'fecha_requerida' => '2026-10-05',
            'created_at' => now()->subDays(3), 'updated_at' => now()->subDays(3),
        ]);
        DB::table('requerimiento_detalles')->insert([
            ['requerimiento_id' => $req2Id, 'material_id' => $matFierroMedia, 'cantidad' => 600.000, 'cantidad_atendida' => 0.000],
        ]);

        $req3Id = DB::table('requerimientos')->insertGetId([
            'codigo' => 'REQ-2026-003', 'obra_id' => $obra2Id, 'almacen_id' => $alm2Id,
            'partida_id' => $partidaPavimento, 'solicitante_id' => $residenteId,
            'prioridad' => 'urgente', 'estado' => 'aprobado',
            'justificacion' => 'Paralización de pavimentación por quiebre de stock.',
            'fecha_requerida' => '2026-09-25', 'aprobado_por' => $gerenteId, 'aprobado_en' => now()->subDays(2),
            'created_at' => now()->subDays(5), 'updated_at' => now()->subDays(2),
        ]);
        DB::table('requerimiento_detalles')->insert([
            ['requerimiento_id' => $req3Id, 'material_id' => $matCementoAndino, 'cantidad' => 650.000, 'cantidad_atendida' => 0.000],
        ]);

        $cot1Id = DB::table('cotizaciones')->insertGetId([
            'requerimiento_id' => $req1Id, 'proveedor_id' => $prov1Id, 'total' => 14625.00,
            'plazo_entrega_dias' => 7, 'condiciones' => 'Pago a 30 días, entrega en almacén.',
            'estado' => 'seleccionada', 'motivo_seleccion' => 'Mejor relación precio-plazo.',
            'created_at' => now()->subDays(11), 'updated_at' => now()->subDays(10),
        ]);
        DB::table('cotizacion_detalles')->insert([
            ['cotizacion_id' => $cot1Id, 'material_id' => $matCementoAndino, 'cantidad' => 400.000, 'precio_unitario' => 32.5000],
            ['cotizacion_id' => $cot1Id, 'material_id' => $matArenaGruesa, 'cantidad' => 25.000, 'precio_unitario' => 65.0000],
        ]);
        $cot2Id = DB::table('cotizaciones')->insertGetId([
            'requerimiento_id' => $req1Id, 'proveedor_id' => $prov3Id, 'total' => 15200.00,
            'plazo_entrega_dias' => 10, 'condiciones' => 'Pago al contado.',
            'estado' => 'recibida', 'created_at' => now()->subDays(11), 'updated_at' => now()->subDays(11),
        ]);
        DB::table('cotizacion_detalles')->insert([
            ['cotizacion_id' => $cot2Id, 'material_id' => $matCementoAndino, 'cantidad' => 400.000, 'precio_unitario' => 33.5000],
            ['cotizacion_id' => $cot2Id, 'material_id' => $matArenaGruesa, 'cantidad' => 25.000, 'precio_unitario' => 68.0000],
        ]);

        $oc1Id = DB::table('ordenes_compra')->insertGetId([
            'codigo' => 'OC-2026-001', 'requerimiento_id' => $req1Id, 'cotizacion_id' => $cot1Id,
            'proveedor_id' => $prov1Id, 'obra_id' => $obra1Id, 'almacen_destino_id' => $alm1Id,
            'urgente' => false, 'estado' => 'recibida', 'total' => 14625.00, 'emitida_por' => $logisticaId,
            'fecha_entrega_prometida' => '2026-09-12',
            'created_at' => now()->subDays(10), 'updated_at' => now()->subDays(4),
        ]);
        $oc1Det1Id = DB::table('orden_compra_detalles')->insertGetId([
            'orden_compra_id' => $oc1Id, 'material_id' => $matCementoAndino, 'cantidad' => 400.000, 'precio_unitario' => 32.5000,
        ]);
        $oc1Det2Id = DB::table('orden_compra_detalles')->insertGetId([
            'orden_compra_id' => $oc1Id, 'material_id' => $matArenaGruesa, 'cantidad' => 25.000, 'precio_unitario' => 65.0000,
        ]);

        $oc2Id = DB::table('ordenes_compra')->insertGetId([
            'codigo' => 'OC-2026-002', 'requerimiento_id' => $req3Id, 'cotizacion_id' => null,
            'proveedor_id' => $prov1Id, 'obra_id' => $obra2Id, 'almacen_destino_id' => $alm2Id,
            'urgente' => true, 'estado' => 'en_transporte', 'total' => 21125.00, 'emitida_por' => $logisticaId,
            'fecha_entrega_prometida' => '2026-10-02',
            'created_at' => now()->subDays(2), 'updated_at' => now()->subDays(2),
        ]);
        DB::table('orden_compra_detalles')->insert([
            ['orden_compra_id' => $oc2Id, 'material_id' => $matCementoAndino, 'cantidad' => 650.000, 'precio_unitario' => 32.5000],
        ]);

        // 13. Transportes
        DB::table('transportes')->insert([
            [
                'orden_compra_id' => $oc1Id, 'transferencia_id' => null, 'transportista' => 'Transportes Mantaro S.A.C.',
                'conductor' => 'Julio Palomino', 'placa' => 'W1A-234', 'telefono' => '964112200',
                'guia_remision' => 'GR-00451', 'estado' => 'entregado',
                'salida_en' => now()->subDays(5), 'llegada_estimada_en' => now()->subDays(4),
                'llegada_real_en' => now()->subDays(4), 'created_at' => now()->subDays(6), 'updated_at' => now()->subDays(4),
            ],
            [
                'orden_compra_id' => $oc2Id, 'transferencia_id' => null, 'transportista' => 'Cargas El Tambo E.I.R.L.',
                'conductor' => 'Mario Ccahuana', 'placa' => 'V2B-789', 'telefono' => '964445577',
                'guia_remision' => 'GR-00512', 'estado' => 'en_ruta',
                'salida_en' => now()->subHours(20), 'llegada_estimada_en' => now()->addHours(6),
                'llegada_real_en' => null, 'created_at' => now()->subDay(), 'updated_at' => now()->subHours(20),
            ],
        ]);

        // 14. Recepciones, lotes y su detalle
        $recepcion1Id = DB::table('recepciones')->insertGetId([
            'codigo' => 'REC-2026-001', 'almacen_id' => $alm1Id, 'orden_compra_id' => $oc1Id,
            'almacenero_id' => $almaceneroId, 'guia_remision' => 'GR-00451', 'estado' => 'aceptada',
            'recibida_en' => now()->subDays(4), 'observaciones' => 'Recepción conforme.',
            'created_at' => now()->subDays(4), 'updated_at' => now()->subDays(4),
        ]);
        $lote1Id = DB::table('lotes')->insertGetId([
            'material_id' => $matCementoAndino, 'codigo_lote' => 'LOTE-CEM-2026-09A', 'proveedor_id' => $prov1Id,
            'fecha_vencimiento' => '2027-03-31', 'estado' => 'disponible', 'codigo_qr' => 'QR-CEM-09A',
            'created_at' => now()->subDays(4), 'updated_at' => now()->subDays(4),
        ]);
        DB::table('recepcion_detalles')->insert([
            [
                'recepcion_id' => $recepcion1Id, 'orden_compra_detalle_id' => $oc1Det1Id, 'material_id' => $matCementoAndino,
                'lote_id' => $lote1Id, 'cantidad_ordenada' => 400.000, 'cantidad_recibida' => 400.000,
                'cumple_especificaciones' => true, 'motivo_rechazo' => null,
            ],
            [
                'recepcion_id' => $recepcion1Id, 'orden_compra_detalle_id' => $oc1Det2Id, 'material_id' => $matArenaGruesa,
                'lote_id' => null, 'cantidad_ordenada' => 25.000, 'cantidad_recibida' => 24.000,
                'cumple_especificaciones' => true, 'motivo_rechazo' => null,
            ],
        ]);

        // 15. Solicitudes de material geolocalizadas
        $sol1Id = DB::table('solicitudes_material')->insertGetId([
            'codigo' => 'SOL-2026-001', 'obra_id' => $obra1Id, 'almacen_id' => $alm1Id,
            'solicitante_id' => $residenteId, 'frente_id' => $frente1Id, 'partida_id' => $partidaConcreto,
            'urgente' => false, 'estado' => 'registrada',
            'created_at' => now()->subDays(2), 'updated_at' => now()->subDays(2),
        ]);
        DB::table('solicitud_material_detalles')->insert([
            ['solicitud_id' => $sol1Id, 'material_id' => $matCementoAndino, 'cantidad' => 60.000, 'cantidad_atendida' => 0.000],
        ]);

        $sol2Id = DB::table('solicitudes_material')->insertGetId([
            'codigo' => 'SOL-2026-002', 'obra_id' => $obra2Id, 'almacen_id' => $alm2Id,
            'solicitante_id' => $residenteId, 'frente_id' => $frente3Id, 'partida_id' => $partidaPavimento,
            'urgente' => true, 'estado' => 'registrada',
            'created_at' => now()->subDay(), 'updated_at' => now()->subDay(),
        ]);
        DB::table('solicitud_material_detalles')->insert([
            ['solicitud_id' => $sol2Id, 'material_id' => $matCementoAndino, 'cantidad' => 80.000, 'cantidad_atendida' => 0.000],
        ]);

        // 16. Búsqueda multialmacén y sus resultados
        $busquedaId = DB::table('busquedas_multialmacen')->insertGetId([
            'solicitud_id' => $sol2Id, 'material_id' => $matCementoAndino, 'almacen_solicitante_id' => $alm2Id,
            'cantidad_requerida' => 80.000, 'radio_m' => 50000,
            'pesos' => json_encode(['distancia' => 0.5, 'stock' => 0.3, 'criticidad' => 0.2]),
            'ejecutada_por' => $logisticaId, 'created_at' => now()->subDay(),
        ]);
        DB::table('busqueda_resultados')->insert([
            ['busqueda_id' => $busquedaId, 'almacen_candidato_id' => $alm3Id, 'cantidad_disponible' => 150.000, 'distancia_m' => 4210.5, 'eta_min' => 35.0, 'puntaje' => 0.9120, 'posicion' => 1, 'elegido' => true],
            ['busqueda_id' => $busquedaId, 'almacen_candidato_id' => $alm1Id, 'cantidad_disponible' => 120.000, 'distancia_m' => 6380.2, 'eta_min' => 52.0, 'puntaje' => 0.7740, 'posicion' => 2, 'elegido' => false],
        ]);

        // 17. Transferencias, despachos y confirmaciones
        $transf1Id = DB::table('transferencias')->insertGetId([
            'codigo' => 'TRF-2026-001', 'almacen_origen_id' => $alm3Id, 'almacen_destino_id' => $alm2Id,
            'solicitud_id' => $sol2Id, 'excedente_id' => $excedenteId, 'motivo' => 'excedente_cierre',
            'estado' => 'en_transito', 'generada_automaticamente' => true,
            'distancia_m' => 4210.5, 'eta_min' => 35.0, 'puntaje' => 0.9120,
            'creada_por' => $logisticaId, 'aprobada_por' => $gerenteId, 'aprobada_en' => now()->subHours(30),
            'created_at' => now()->subDays(2), 'updated_at' => now()->subHours(30),
        ]);
        DB::table('transferencia_detalles')->insert([
            ['transferencia_id' => $transf1Id, 'material_id' => $matCementoAndino, 'lote_id' => $lote1Id, 'cantidad_solicitada' => 80.000, 'cantidad_despachada' => 80.000, 'cantidad_recibida' => null],
        ]);
        DB::table('despachos')->insert([
            'transferencia_id' => $transf1Id, 'despachado_por' => $almaceneroId,
            'despachado_en' => now()->subHours(28), 'observaciones' => 'Despacho con guía interna.',
            'created_at' => now()->subHours(28), 'updated_at' => now()->subHours(28),
        ]);

        $transf2Id = DB::table('transferencias')->insertGetId([
            'codigo' => 'TRF-2026-002', 'almacen_origen_id' => $alm1Id, 'almacen_destino_id' => $alm2Id,
            'solicitud_id' => null, 'excedente_id' => null, 'motivo' => 'traslado_programado',
            'estado' => 'completada', 'generada_automaticamente' => false,
            'distancia_m' => 6380.2, 'eta_min' => 52.0, 'puntaje' => 0.7740,
            'creada_por' => $logisticaId, 'aprobada_por' => $gerenteId, 'aprobada_en' => now()->subDays(8),
            'created_at' => now()->subDays(9), 'updated_at' => now()->subDays(6),
        ]);
        DB::table('transferencia_detalles')->insert([
            ['transferencia_id' => $transf2Id, 'material_id' => $matCementoAndino, 'lote_id' => null, 'cantidad_solicitada' => 40.000, 'cantidad_despachada' => 40.000, 'cantidad_recibida' => 37.000],
        ]);
        DB::table('despachos')->insert([
            'transferencia_id' => $transf2Id, 'despachado_por' => $almaceneroId,
            'despachado_en' => now()->subDays(7), 'observaciones' => null,
            'created_at' => now()->subDays(7), 'updated_at' => now()->subDays(7),
        ]);
        DB::table('confirmaciones_recepcion_destino')->insert([
            'transferencia_id' => $transf2Id, 'almacenero_id' => $almaceneroId,
            'recibida_en' => now()->subDays(6), 'hay_diferencias' => true,
            'observaciones' => 'Faltaron 3 bolsas respecto a lo despachado.',
            'created_at' => now()->subDays(6), 'updated_at' => now()->subDays(6),
        ]);

        // 18. Mermas
        DB::table('mermas')->insert([
            [
                'almacen_id' => $alm2Id, 'material_id' => $matCementoAndino, 'lote_id' => null,
                'transferencia_id' => $transf2Id, 'cantidad' => 3.000, 'causa' => 'rotura',
                'justificacion' => 'Bolsas rotas durante el transporte interno.',
                'estado' => 'registrada', 'registrada_por' => $almaceneroId,
                'created_at' => now()->subDays(6), 'updated_at' => now()->subDays(6),
            ],
            [
                'almacen_id' => $alm1Id, 'material_id' => $matArenaGruesa, 'lote_id' => null,
                'transferencia_id' => null, 'cantidad' => 1.500, 'causa' => 'humedad',
                'justificacion' => 'Pérdida por exposición a la lluvia en patio.',
                'estado' => 'registrada', 'registrada_por' => $almaceneroId,
                'created_at' => now()->subDays(10), 'updated_at' => now()->subDays(10),
            ],
        ]);

        // 19. Inventario físico
        $inventarioId = DB::table('inventarios_fisicos')->insertGetId([
            'almacen_id' => $alm1Id, 'periodo' => '2026-08', 'estado' => 'en_proceso', 'ciego' => true,
            'tolerancia_pct' => 2.00, 'programado_por' => $gerenteId,
            'created_at' => now()->subDays(3), 'updated_at' => now()->subDays(3),
        ]);
        DB::table('inventario_fisico_detalles')->insert([
            ['inventario_id' => $inventarioId, 'material_id' => $matCementoAndino, 'cantidad_sistema' => 120.000, 'cantidad_contada' => 118.000, 'diferencia' => -2.000],
            ['inventario_id' => $inventarioId, 'material_id' => $matFierroMedia, 'cantidad_sistema' => 0.000, 'cantidad_contada' => 0.000, 'diferencia' => 0.000],
        ]);

        // 20. Kardex (últimos días para el panel)
        DB::table('kardex')->insert([
            ['almacen_id' => $alm1Id, 'material_id' => $matCementoAndino, 'tipo_movimiento' => 'ingreso_compra', 'cantidad' => 400.000, 'saldo_resultante' => 400.000, 'costo_unitario' => 32.5000, 'documento_tipo' => 'recepcion', 'documento_id' => $recepcion1Id, 'usuario_id' => $almaceneroId, 'observacion' => 'Ingreso por OC-2026-001', 'created_at' => now()->subDays(3)],
            ['almacen_id' => $alm1Id, 'material_id' => $matCementoAndino, 'tipo_movimiento' => 'salida_despacho', 'cantidad' => -150.000, 'saldo_resultante' => 250.000, 'costo_unitario' => 32.5000, 'documento_tipo' => 'transferencia', 'documento_id' => $transf2Id, 'usuario_id' => $almaceneroId, 'observacion' => 'Salida a El Tambo', 'created_at' => now()->subDays(2)],
            ['almacen_id' => $alm2Id, 'material_id' => $matCementoAndino, 'tipo_movimiento' => 'ingreso_transferencia', 'cantidad' => 37.000, 'saldo_resultante' => 52.000, 'costo_unitario' => 32.5000, 'documento_tipo' => 'transferencia', 'documento_id' => $transf2Id, 'usuario_id' => $almaceneroId, 'observacion' => 'Recepción El Tambo', 'created_at' => now()->subDays(1)],
            ['almacen_id' => $alm1Id, 'material_id' => $matArenaGruesa, 'tipo_movimiento' => 'salida_merma', 'cantidad' => -1.500, 'saldo_resultante' => 23.500, 'costo_unitario' => 65.0000, 'documento_tipo' => 'merma', 'documento_id' => null, 'usuario_id' => $almaceneroId, 'observacion' => 'Merma por humedad', 'created_at' => now()],
        ]);

        // 21. Alertas del sistema
        DB::table('alertas')->insert([
            ['obra_id' => $obra2Id, 'tipo' => 'stock_bajo_minimo', 'severidad' => 'alta', 'mensaje' => 'Cemento Andino bajo el stock mínimo en Almacén de Obra El Tambo.', 'referencia_tipo' => 'stock_almacen', 'referencia_id' => null, 'estado' => 'abierta', 'created_at' => now()->subDays(2), 'updated_at' => now()->subDays(2)],
            ['obra_id' => $obra2Id, 'tipo' => 'transferencia_diferencia', 'severidad' => 'media', 'mensaje' => 'Diferencia de 3 bolsas en la transferencia TRF-2026-002.', 'referencia_tipo' => 'transferencia', 'referencia_id' => $transf2Id, 'estado' => 'abierta', 'created_at' => now()->subDays(6), 'updated_at' => now()->subDays(6)],
            ['obra_id' => $obra3Id, 'tipo' => 'excedente_detectado', 'severidad' => 'baja', 'mensaje' => 'Excedente de cemento disponible para redistribución desde Chilca.', 'referencia_tipo' => 'excedente', 'referencia_id' => $excedenteId, 'estado' => 'abierta', 'created_at' => now()->subDays(1), 'updated_at' => now()->subDays(1)],
            ['obra_id' => $obra1Id, 'tipo' => 'requerimiento_urgente', 'severidad' => 'alta', 'mensaje' => 'Requerimiento urgente REQ-2026-003 pendiente de atención.', 'referencia_tipo' => 'requerimiento', 'referencia_id' => $req3Id, 'estado' => 'abierta', 'created_at' => now()->subDays(2), 'updated_at' => now()->subDays(2)],
        ]);

        // 22. Gestión de proyecto (PMI): fases, hitos, avances y valorizaciones
        DB::table('obra_fases')->insert([
            ['obra_id' => $obra1Id, 'fase' => 'iniciacion', 'estado' => 'completada', 'aprobada_por' => $gerenteId, 'aprobada_en' => now()->subMonths(8), 'observaciones' => null, 'created_at' => now(), 'updated_at' => now()],
            ['obra_id' => $obra1Id, 'fase' => 'planificacion', 'estado' => 'completada', 'aprobada_por' => $gerenteId, 'aprobada_en' => now()->subMonths(7), 'observaciones' => null, 'created_at' => now(), 'updated_at' => now()],
            ['obra_id' => $obra1Id, 'fase' => 'ejecucion', 'estado' => 'en_proceso', 'aprobada_por' => null, 'aprobada_en' => null, 'observaciones' => null, 'created_at' => now(), 'updated_at' => now()],
            ['obra_id' => $obra1Id, 'fase' => 'seguimiento_control', 'estado' => 'en_proceso', 'aprobada_por' => null, 'aprobada_en' => null, 'observaciones' => null, 'created_at' => now(), 'updated_at' => now()],
            ['obra_id' => $obra2Id, 'fase' => 'iniciacion', 'estado' => 'completada', 'aprobada_por' => $gerenteId, 'aprobada_en' => now()->subMonths(6), 'observaciones' => null, 'created_at' => now(), 'updated_at' => now()],
            ['obra_id' => $obra2Id, 'fase' => 'ejecucion', 'estado' => 'en_proceso', 'aprobada_por' => null, 'aprobada_en' => null, 'observaciones' => null, 'created_at' => now(), 'updated_at' => now()],
            ['obra_id' => $obra3Id, 'fase' => 'cierre', 'estado' => 'en_proceso', 'aprobada_por' => null, 'aprobada_en' => null, 'observaciones' => null, 'created_at' => now(), 'updated_at' => now()],
        ]);

        DB::table('hitos')->insert([
            ['obra_id' => $obra1Id, 'nombre' => 'Inicio de obra', 'fecha_planificada' => '2026-03-01', 'fecha_real' => '2026-03-03', 'estado' => 'cumplido', 'created_at' => now(), 'updated_at' => now()],
            ['obra_id' => $obra1Id, 'nombre' => 'Cimentación terminada', 'fecha_planificada' => '2026-05-30', 'fecha_real' => '2026-06-05', 'estado' => 'cumplido', 'created_at' => now(), 'updated_at' => now()],
            ['obra_id' => $obra1Id, 'nombre' => 'Estructura principal', 'fecha_planificada' => '2026-09-30', 'fecha_real' => null, 'estado' => 'en_proceso', 'created_at' => now(), 'updated_at' => now()],
            ['obra_id' => $obra2Id, 'nombre' => 'Inicio de obra', 'fecha_planificada' => '2026-04-15', 'fecha_real' => '2026-04-18', 'estado' => 'cumplido', 'created_at' => now(), 'updated_at' => now()],
            ['obra_id' => $obra2Id, 'nombre' => 'Base granular colocada', 'fecha_planificada' => '2026-10-15', 'fecha_real' => null, 'estado' => 'pendiente', 'created_at' => now(), 'updated_at' => now()],
        ]);

        DB::table('avances_fisicos')->insert([
            ['obra_id' => $obra1Id, 'frente_id' => $frente1Id, 'partida_id' => $partidaConcreto, 'periodo' => '2026-08-31', 'metrado_ejecutado' => 310.000, 'avance_pct_acumulado' => 68.90, 'registrado_por' => $residenteId, 'created_at' => now(), 'updated_at' => now()],
            ['obra_id' => $obra1Id, 'frente_id' => $frente1Id, 'partida_id' => $partidaAcero, 'periodo' => '2026-08-31', 'metrado_ejecutado' => 18200.000, 'avance_pct_acumulado' => 65.00, 'registrado_por' => $residenteId, 'created_at' => now(), 'updated_at' => now()],
            ['obra_id' => $obra2Id, 'frente_id' => $frente3Id, 'partida_id' => $partidaTierras, 'periodo' => '2026-08-31', 'metrado_ejecutado' => 5400.000, 'avance_pct_acumulado' => 45.00, 'registrado_por' => $residenteId, 'created_at' => now(), 'updated_at' => now()],
        ]);

        DB::table('lineas_base_costo')->insert([
            ['obra_id' => $obra1Id, 'version' => 1, 'bac' => 1850000.00, 'vigente' => true, 'aprobada_por' => $gerenteId, 'created_at' => now(), 'updated_at' => now()],
            ['obra_id' => $obra2Id, 'version' => 1, 'bac' => 2400000.00, 'vigente' => true, 'aprobada_por' => $gerenteId, 'created_at' => now(), 'updated_at' => now()],
        ]);

        DB::table('valorizaciones')->insert([
            ['obra_id' => $obra1Id, 'periodo' => '2026-06-30', 'valor_planificado' => 260000.00, 'valor_ganado' => 245000.00, 'costo_real' => 238000.00, 'estado' => 'aprobada', 'aprobada_por' => $gerenteId, 'created_at' => now(), 'updated_at' => now()],
            ['obra_id' => $obra1Id, 'periodo' => '2026-07-31', 'valor_planificado' => 280000.00, 'valor_ganado' => 292000.00, 'costo_real' => 279000.00, 'estado' => 'aprobada', 'aprobada_por' => $gerenteId, 'created_at' => now(), 'updated_at' => now()],
            ['obra_id' => $obra1Id, 'periodo' => '2026-08-31', 'valor_planificado' => 300000.00, 'valor_ganado' => 296000.00, 'costo_real' => 301000.00, 'estado' => 'borrador', 'aprobada_por' => null, 'created_at' => now(), 'updated_at' => now()],
            ['obra_id' => $obra2Id, 'periodo' => '2026-07-31', 'valor_planificado' => 320000.00, 'valor_ganado' => 305000.00, 'costo_real' => 310000.00, 'estado' => 'aprobada', 'aprobada_por' => $gerenteId, 'created_at' => now(), 'updated_at' => now()],
            ['obra_id' => $obra2Id, 'periodo' => '2026-08-31', 'valor_planificado' => 340000.00, 'valor_ganado' => 318000.00, 'costo_real' => 329000.00, 'estado' => 'borrador', 'aprobada_por' => null, 'created_at' => now(), 'updated_at' => now()],
        ]);

        // 23. Riesgos, cambios, interesados y documentos
        DB::table('riesgos')->insert([
            ['obra_id' => $obra1Id, 'descripcion' => 'Retraso en el suministro de cemento por problemas logísticos.', 'categoria' => 'logistica', 'probabilidad' => 4, 'impacto' => 4, 'respuesta' => 'Ampliar cartera de proveedores y stock de seguridad.', 'responsable_id' => $logisticaId, 'estado' => 'abierto', 'origen' => 'manual', 'created_at' => now(), 'updated_at' => now()],
            ['obra_id' => $obra1Id, 'descripcion' => 'Variación del tipo de cambio en acero importado.', 'categoria' => 'financiero', 'probabilidad' => 3, 'impacto' => 3, 'respuesta' => 'Contratos con precio fijo.', 'responsable_id' => $gerenteId, 'estado' => 'abierto', 'origen' => 'manual', 'created_at' => now(), 'updated_at' => now()],
            ['obra_id' => $obra2Id, 'descripcion' => 'Lluvias intensas que retrasen la pavimentación.', 'categoria' => 'clima', 'probabilidad' => 5, 'impacto' => 4, 'respuesta' => 'Adelantar frentes cubiertos y turnos extendidos.', 'responsable_id' => $residenteId, 'estado' => 'abierto', 'origen' => 'automatico', 'created_at' => now(), 'updated_at' => now()],
        ]);

        DB::table('solicitudes_cambio')->insert([
            ['obra_id' => $obra2Id, 'tipo' => 'plazo', 'descripcion' => 'Ampliación de plazo por lluvias atípicas.', 'impacto_plazo_dias' => 15, 'impacto_costo' => 0.00, 'estado' => 'solicitada', 'solicitada_por' => $residenteId, 'decidida_por' => null, 'decidida_en' => null, 'created_at' => now(), 'updated_at' => now()],
            ['obra_id' => $obra1Id, 'tipo' => 'costo', 'descripcion' => 'Adicional de obra por mejoramiento de terreno.', 'impacto_plazo_dias' => 5, 'impacto_costo' => 68000.00, 'estado' => 'aprobada', 'solicitada_por' => $residenteId, 'decidida_por' => $gerenteId, 'decidida_en' => now()->subDays(7), 'created_at' => now(), 'updated_at' => now()],
        ]);

        $interesado1Id = DB::table('interesados')->insertGetId([
            'obra_id' => $obra1Id, 'nombre' => 'Municipalidad Distrital de Pillco Marca', 'tipo' => 'externo',
            'influencia' => 5, 'interes' => 5, 'contacto' => 'mesa.partes@pillcomarca.gob.pe',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('interesados')->insert([
            ['obra_id' => null, 'nombre' => 'Junta Vecinal Los Andes', 'tipo' => 'externo', 'influencia' => 3, 'interes' => 4, 'contacto' => null, 'created_at' => now(), 'updated_at' => now()],
            ['obra_id' => $obra1Id, 'nombre' => 'Supervisión de Obra', 'tipo' => 'externo', 'influencia' => 4, 'interes' => 5, 'contacto' => null, 'created_at' => now(), 'updated_at' => now()],
        ]);

        $doc1Id = DB::table('documentos')->insertGetId([
            'obra_id' => $obra1Id, 'tipo' => 'informe', 'titulo' => 'Informe mensual de avance - Agosto 2026',
            'ruta' => 'documentos/obr01/informe-agosto-2026.pdf', 'hash_sha256' => str_repeat('a', 64),
            'version' => 1, 'subido_por' => $residenteId, 'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('documentos')->insert([
            ['obra_id' => $obra2Id, 'tipo' => 'plano', 'titulo' => 'Plano de planta de pavimentación', 'ruta' => 'documentos/obr02/plano-planta.pdf', 'hash_sha256' => str_repeat('b', 64), 'version' => 2, 'subido_por' => $residenteId, 'created_at' => now(), 'updated_at' => now()],
            ['obra_id' => $obra1Id, 'tipo' => 'acta', 'titulo' => 'Acta de reunión de coordinación', 'ruta' => 'documentos/obr01/acta-15.pdf', 'hash_sha256' => str_repeat('c', 64), 'version' => 1, 'subido_por' => $gerenteId, 'created_at' => now(), 'updated_at' => now()],
        ]);

        DB::table('comunicaciones')->insert([
            ['obra_id' => $obra1Id, 'interesado_id' => $interesado1Id, 'tipo' => 'carta', 'sentido' => 'enviada', 'asunto' => 'Solicitud de conformidad de adicional de obra.', 'fecha' => '2026-09-02', 'estado' => 'atendida', 'documento_id' => $doc1Id, 'created_at' => now(), 'updated_at' => now()],
            ['obra_id' => $obra2Id, 'interesado_id' => $interesado1Id, 'tipo' => 'informe', 'sentido' => 'enviada', 'asunto' => 'Reporte de avance semanal.', 'fecha' => '2026-09-08', 'estado' => 'pendiente', 'documento_id' => null, 'created_at' => now(), 'updated_at' => now()],
        ]);

        // 24. Cierre de obra (Chilca)
        DB::table('cierres_obra')->insert([
            'obra_id' => $obra3Id, 'fecha_ejecucion_100' => '2026-05-20', 'informe_final_id' => null,
            'fecha_recepcion_obra' => null, 'acta_recepcion_id' => null, 'estado' => 'en_proceso',
            'excedentes_evaluados' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);

        DB::table('lecciones_aprendidas')->insert([
            ['obra_id' => $obra3Id, 'area_conocimiento' => 'costo', 'descripcion' => 'Se generó excedente de cemento al cierre.', 'recomendacion' => 'Proyectar consumos con mayor precisión y redistribuir excedentes antes del cierre.', 'registrada_por' => $residenteId, 'created_at' => now(), 'updated_at' => now()],
            ['obra_id' => $obra1Id, 'area_conocimiento' => 'riesgos', 'descripcion' => 'El acero sufrió retrasos por abastecimiento.', 'recomendacion' => 'Contratos marco con proveedores locales.', 'registrada_por' => $logisticaId, 'created_at' => now(), 'updated_at' => now()],
        ]);

        DB::table('equipos')->insert([
            ['obra_id' => $obra1Id, 'codigo' => 'EQ-001', 'nombre' => 'Mezcladora de concreto 1 saco', 'tipo' => 'maquinaria', 'estado' => 'operativo', 'created_at' => now(), 'updated_at' => now()],
            ['obra_id' => $obra2Id, 'codigo' => 'EQ-002', 'nombre' => 'Retroexcavadora CAT 420', 'tipo' => 'maquinaria', 'estado' => 'operativo', 'created_at' => now(), 'updated_at' => now()],
            ['obra_id' => null, 'codigo' => 'EQ-003', 'nombre' => 'Vibrador de concreto', 'tipo' => 'herramienta', 'estado' => 'mantenimiento', 'created_at' => now(), 'updated_at' => now()],
        ]);

        // 25. Personal, asistencia y SST
        $trab1Id = DB::table('trabajadores')->insertGetId([
            'usuario_id' => null, 'obra_id' => $obra1Id, 'dni' => '70123456', 'nombres' => 'Juan Pérez Ramos',
            'cargo' => 'Operario de construcción civil', 'frente_id' => $frente1Id, 'activo' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $trab2Id = DB::table('trabajadores')->insertGetId([
            'usuario_id' => null, 'obra_id' => $obra1Id, 'dni' => '71234567', 'nombres' => 'María Huamán Loayza',
            'cargo' => 'Peón', 'frente_id' => $frente2Id, 'activo' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $trab3Id = DB::table('trabajadores')->insertGetId([
            'usuario_id' => null, 'obra_id' => $obra2Id, 'dni' => '72345678', 'nombres' => 'Luis Ccori Atencio',
            'cargo' => 'Maestro de obra', 'frente_id' => $frente3Id, 'activo' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        DB::table('marcaciones')->insert([
            ['trabajador_id' => $trab1Id, 'obra_id' => $obra1Id, 'tipo' => 'entrada', 'marcado_en' => now()->subDay()->setTime(7, 5), 'distancia_a_obra_m' => 12.5, 'dentro_geocerca' => true, 'created_at' => now()->subDay()->setTime(7, 5)],
            ['trabajador_id' => $trab1Id, 'obra_id' => $obra1Id, 'tipo' => 'salida', 'marcado_en' => now()->subDay()->setTime(17, 3), 'distancia_a_obra_m' => 15.0, 'dentro_geocerca' => true, 'created_at' => now()->subDay()->setTime(17, 3)],
            ['trabajador_id' => $trab2Id, 'obra_id' => $obra1Id, 'tipo' => 'entrada', 'marcado_en' => now()->setTime(7, 15), 'distancia_a_obra_m' => 140.0, 'dentro_geocerca' => true, 'created_at' => now()->setTime(7, 15)],
        ]);

        DB::table('asistencias')->insert([
            ['trabajador_id' => $trab1Id, 'obra_id' => $obra1Id, 'fecha' => now()->subDay()->toDateString(), 'horas_trabajadas' => 8.00, 'inconsistencia' => null, 'estado' => 'consolidada', 'created_at' => now(), 'updated_at' => now()],
            ['trabajador_id' => $trab2Id, 'obra_id' => $obra1Id, 'fecha' => now()->subDay()->toDateString(), 'horas_trabajadas' => 8.00, 'inconsistencia' => null, 'estado' => 'consolidada', 'created_at' => now(), 'updated_at' => now()],
            ['trabajador_id' => $trab3Id, 'obra_id' => $obra2Id, 'fecha' => now()->subDay()->toDateString(), 'horas_trabajadas' => 9.00, 'inconsistencia' => 'marcacion_faltante', 'estado' => 'observada', 'created_at' => now(), 'updated_at' => now()],
        ]);

        $planilla1Id = DB::table('planillas')->insertGetId([
            'obra_id' => $obra1Id, 'periodo' => '2026-08', 'estado' => 'cerrada', 'total' => 8450.00,
            'procesada_por' => $gerenteId, 'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('planilla_detalles')->insert([
            ['planilla_id' => $planilla1Id, 'trabajador_id' => $trab1Id, 'dias_laborados' => 26, 'horas_totales' => 208.00, 'monto' => 5200.00],
            ['planilla_id' => $planilla1Id, 'trabajador_id' => $trab2Id, 'dias_laborados' => 25, 'horas_totales' => 200.00, 'monto' => 3250.00],
        ]);

        $capacitacion1Id = DB::table('capacitaciones')->insertGetId([
            'tipo' => 'sst', 'titulo' => 'Inducción de seguridad en obra', 'obra_id' => $obra1Id,
            'fecha_programada' => now()->subDays(15), 'instructor' => 'Ing. SST Externo', 'nota_minima' => 14,
            'vigencia_meses' => 12, 'programada_por' => $gerenteId, 'estado' => 'ejecutada',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('capacitacion_participantes')->insert([
            ['capacitacion_id' => $capacitacion1Id, 'usuario_id' => null, 'trabajador_id' => $trab1Id, 'nota' => 16.0, 'intento' => 1, 'aprobado' => true],
            ['capacitacion_id' => $capacitacion1Id, 'usuario_id' => null, 'trabajador_id' => $trab2Id, 'nota' => 15.5, 'intento' => 1, 'aprobado' => true],
        ]);
        DB::table('certificaciones_usuario')->insert([
            'usuario_id' => $almaceneroId, 'capacitacion_id' => $capacitacion1Id, 'tipo' => 'sistema_almacen',
            'vigente_desde' => now()->subDays(15)->toDateString(), 'vigente_hasta' => now()->addMonths(12)->toDateString(),
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $incidente1Id = DB::table('incidentes')->insertGetId([
            'codigo' => 'INC-2026-001', 'obra_id' => $obra1Id, 'trabajador_id' => $trab1Id,
            'reportado_por' => $residenteId, 'tipo' => 'casi_accidente', 'gravedad' => 'leve',
            'ocurrido_en' => now()->subDays(9), 'descripcion' => 'Desprendimiento menor de material sin daños personales.',
            'requiere_traslado' => false, 'estado' => 'investigado', 'causas' => 'Falta de señalización temporal.',
            'validado_por' => $gerenteId, 'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('acciones_correctivas')->insert([
            ['origen_tipo' => 'incidente', 'origen_id' => $incidente1Id, 'descripcion' => 'Colocar señalización y mallas de protección.', 'tipo' => 'correctiva', 'responsable_id' => $residenteId, 'fecha_limite' => now()->addDays(5)->toDateString(), 'estado' => 'en_proceso', 'created_at' => now(), 'updated_at' => now()],
            ['origen_tipo' => 'hallazgo', 'origen_id' => $inventarioId, 'descripcion' => 'Reforzar control de stock de cemento.', 'tipo' => 'preventiva', 'responsable_id' => $almaceneroId, 'fecha_limite' => now()->addDays(10)->toDateString(), 'estado' => 'pendiente', 'created_at' => now(), 'updated_at' => now()],
        ]);

        $eppSol1Id = DB::table('epp_solicitudes')->insertGetId([
            'trabajador_id' => $trab1Id, 'almacen_id' => $alm1Id, 'material_id' => $matCascoSeguridad,
            'cantidad' => 2.00, 'autorizada_por' => $almaceneroId, 'estado' => 'atendida',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('epp_asignaciones')->insert([
            ['trabajador_id' => $trab1Id, 'material_id' => $matCascoSeguridad, 'almacen_id' => $alm1Id, 'numero_serie' => 'CASCO-0001', 'entregado_por' => $almaceneroId, 'entregado_en' => now()->subDays(20), 'estado' => 'vigente'],
            ['trabajador_id' => $trab2Id, 'material_id' => $matCascoSeguridad, 'almacen_id' => $alm1Id, 'numero_serie' => 'CASCO-0002', 'entregado_por' => $almaceneroId, 'entregado_en' => now()->subDays(20), 'estado' => 'vigente'],
        ]);

        // 26. Calidad y observaciones técnicas
        $obs1Id = DB::table('observaciones_tecnicas')->insertGetId([
            'obra_id' => $obra1Id, 'numero_acta' => 'ACTA-OT-2026-004', 'descripcion' => 'Fisuras superficiales en tarrajeo de muro lateral.',
            'origen' => 'supervision', 'plazo_subsanacion' => now()->addDays(10)->toDateString(),
            'responsable_id' => $residenteId, 'estado' => 'notificada', 'planos_asbuilt_actualizados' => false,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('observacion_evidencias')->insert([
            ['observacion_id' => $obs1Id, 'etapa' => 'inicial', 'ruta' => 'evidencias/obr01/obs-ot-004-inicial.jpg', 'created_at' => now()->subDays(4)],
        ]);

        // 27. Ambiental y residuos
        $pmItem1Id = DB::table('plan_manejo_items')->insertGetId([
            'obra_id' => $obra1Id, 'descripcion' => 'Control de material particulado en accesos mediante riego.',
            'frecuencia' => 'diaria', 'created_at' => now(), 'updated_at' => now(),
        ]);
        $pmItem2Id = DB::table('plan_manejo_items')->insertGetId([
            'obra_id' => $obra1Id, 'descripcion' => 'Manejo y segregación de residuos de construcción.',
            'frecuencia' => 'semanal', 'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('plan_manejo_verificaciones')->insert([
            ['item_id' => $pmItem1Id, 'verificado_por' => $residenteId, 'cumple' => true, 'observacion' => 'Riego ejecutado.', 'verificado_en' => now()->subDays(3)],
            ['item_id' => $pmItem2Id, 'verificado_por' => $residenteId, 'cumple' => false, 'observacion' => 'Puntos de acopio incompletos.', 'verificado_en' => now()->subDays(2)],
        ]);

        $indPolvo = DB::table('indicadores_ambientales')->where('codigo', 'polvo')->value('id');
        $indRuido = DB::table('indicadores_ambientales')->where('codigo', 'ruido')->value('id');
        DB::table('mediciones_ambientales')->insert([
            ['obra_id' => $obra1Id, 'indicador_id' => $indPolvo, 'valor' => 138.000, 'fuera_de_limite' => false, 'medida_correctiva' => null, 'medida_aplicada_por' => null, 'medido_por' => $residenteId, 'medido_en' => now()->subDays(3), 'created_at' => now(), 'updated_at' => now()],
            ['obra_id' => $obra1Id, 'indicador_id' => $indRuido, 'valor' => 86.000, 'fuera_de_limite' => true, 'medida_correctiva' => 'Restringir horario de equipos de mayor ruido.', 'medida_aplicada_por' => $residenteId, 'medido_por' => $residenteId, 'medido_en' => now()->subDay(), 'created_at' => now(), 'updated_at' => now()],
        ]);

        $eors1Id = DB::table('empresas_eors')->insertGetId([
            'ruc' => '20556677889', 'razon_social' => 'EORS Junín Ambiental S.A.C.',
            'autorizacion' => 'AUT-2026-3344', 'vigente_hasta' => now()->addYear()->toDateString(),
            'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('residuos')->insert([
            ['obra_id' => $obra1Id, 'almacen_id' => $alm1Id, 'clase' => 'no_peligroso', 'descripcion' => 'Retazos de madera y escombros.', 'material_id' => null, 'volumen' => 12.500, 'unidad' => 'm3', 'registrado_por' => $residenteId, 'destino' => 'reaprovechamiento', 'transferencia_id' => null, 'eors_id' => null, 'manifiesto_id' => null, 'estado' => 'reaprovechado', 'created_at' => now(), 'updated_at' => now()],
            ['obra_id' => $obra1Id, 'almacen_id' => $alm1Id, 'clase' => 'no_peligroso', 'descripcion' => 'Residuos comunes de construcción.', 'material_id' => null, 'volumen' => 8.000, 'unidad' => 'm3', 'registrado_por' => $residenteId, 'destino' => 'eors', 'transferencia_id' => null, 'eors_id' => $eors1Id, 'manifiesto_id' => null, 'estado' => 'entregado', 'created_at' => now(), 'updated_at' => now()],
        ]);

        // 28. Notificaciones
        DB::table('notificaciones')->insert([
            ['usuario_id' => $residenteId, 'tipo' => 'stock_critico', 'titulo' => 'Stock bajo mínimo', 'cuerpo' => 'Cemento Andino bajo mínimo en El Tambo.', 'referencia_tipo' => 'stock_almacen', 'referencia_id' => null, 'leida_en' => null, 'created_at' => now()->subDays(2), 'updated_at' => now()->subDays(2)],
            ['usuario_id' => $almaceneroId, 'tipo' => 'transferencia_pendiente', 'titulo' => 'Recepción de transferencia pendiente', 'cuerpo' => 'La transferencia TRF-2026-001 está en tránsito.', 'referencia_tipo' => 'transferencia', 'referencia_id' => $transf1Id, 'leida_en' => null, 'created_at' => now()->subHours(28), 'updated_at' => now()->subHours(28)],
            ['usuario_id' => $logisticaId, 'tipo' => 'requerimiento_urgente', 'titulo' => 'Requerimiento urgente', 'cuerpo' => 'REQ-2026-003 requiere atención inmediata.', 'referencia_tipo' => 'requerimiento', 'referencia_id' => $req3Id, 'leida_en' => now()->subDay(), 'created_at' => now()->subDays(2), 'updated_at' => now()->subDay()],
        ]);
    }
}
