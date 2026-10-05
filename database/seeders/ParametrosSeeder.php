<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ParametrosSeeder extends Seeder
{
    public function run(): void
    {
        $parametros = [
            ['clave' => 'rank.peso_cercania', 'valor' => '0.35', 'tipo' => 'numero', 'descripcion' => 'Peso de cercanía (distancia/ETA) en el ranking de obras'],
            ['clave' => 'rank.peso_urgencia', 'valor' => '0.25', 'tipo' => 'numero', 'descripcion' => 'Peso de urgencia de la necesidad'],
            ['clave' => 'rank.peso_cobertura', 'valor' => '0.20', 'tipo' => 'numero', 'descripcion' => 'Peso del % de déficit cubierto'],
            ['clave' => 'rank.peso_transporte', 'valor' => '0.10', 'tipo' => 'numero', 'descripcion' => 'Peso de disponibilidad de transporte'],
            ['clave' => 'rank.peso_criticidad', 'valor' => '0.10', 'tipo' => 'numero', 'descripcion' => 'Peso de criticidad del material'],
            ['clave' => 'geo.radio_busqueda_m', 'valor' => '50000', 'tipo' => 'numero', 'descripcion' => 'Radio por defecto de búsqueda multi-almacén (m)'],
            ['clave' => 'geo.factor_ruta', 'valor' => '1.35', 'tipo' => 'numero', 'descripcion' => 'Factor distancia geodésica -> distancia por carretera (respaldo)'],
            ['clave' => 'geo.velocidad_media_kmh', 'valor' => '35', 'tipo' => 'numero', 'descripcion' => 'Velocidad media para ETA estimada'],
            ['clave' => 'transferencia.generacion_automatica', 'valor' => 'false', 'tipo' => 'booleano', 'descripcion' => 'Si true, genera la orden sin confirmación humana'],
            ['clave' => 'capacitacion.nota_minima', 'valor' => '11', 'tipo' => 'numero', 'descripcion' => 'Nota mínima para certificar almacenero'],
            ['clave' => 'inventario.tolerancia_pct', 'valor' => '2', 'tipo' => 'numero', 'descripcion' => 'Tolerancia de diferencia en inventario físico'],
            ['clave' => 'asistencia.radio_geocerca_m', 'valor' => '150', 'tipo' => 'numero', 'descripcion' => 'Radio de geocerca por defecto'],
            ['clave' => 'pmu.denominacion', 'valor' => 'Program Management Unit', 'tipo' => 'texto', 'descripcion' => 'Denominación oficial de la unidad de gestión a nivel programa'],
        ];

        foreach ($parametros as $p) {
            DB::table('parametros_sistema')->updateOrInsert(
                ['clave' => $p['clave']],
                ['valor' => $p['valor'], 'tipo' => $p['tipo'], 'descripcion' => $p['descripcion'], 'updated_at' => now(), 'created_at' => now()]
            );
        }

        $unidades = [
            ['codigo' => 'bls', 'nombre' => 'Bolsa'],
            ['codigo' => 'm3', 'nombre' => 'Metro cúbico'],
            ['codigo' => 'kg', 'nombre' => 'Kilogramo'],
            ['codigo' => 'und', 'nombre' => 'Unidad'],
            ['codigo' => 'var', 'nombre' => 'Varilla'],
            ['codigo' => 'gal', 'nombre' => 'Galón'],
            ['codigo' => 'par', 'nombre' => 'Par'],
        ];

        foreach ($unidades as $u) {
            DB::table('unidades_medida')->updateOrInsert(
                ['codigo' => $u['codigo']],
                ['nombre' => $u['nombre']]
            );
        }

        $categorias = [
            ['nombre' => 'Cementos y aglomerantes'],
            ['nombre' => 'Agregados'],
            ['nombre' => 'Acero y fierro'],
            ['nombre' => 'Ladrillos y bloques'],
            ['nombre' => 'Pinturas y acabados'],
            ['nombre' => 'EPP'],
        ];

        foreach ($categorias as $c) {
            DB::table('categorias_material')->updateOrInsert(
                ['nombre' => $c['nombre']],
                ['updated_at' => now(), 'created_at' => now()]
            );
        }

        $indicadores = [
            ['codigo' => 'polvo', 'nombre' => 'Material particulado (PM10)', 'unidad' => 'µg/m³', 'limite_maximo' => 150],
            ['codigo' => 'ruido', 'nombre' => 'Ruido diurno', 'unidad' => 'dB', 'limite_maximo' => 80],
            ['codigo' => 'vertimientos', 'nombre' => 'Vertimientos (turbidez)', 'unidad' => 'NTU', 'limite_maximo' => 50],
        ];

        foreach ($indicadores as $ind) {
            DB::table('indicadores_ambientales')->updateOrInsert(
                ['codigo' => $ind['codigo']],
                ['nombre' => $ind['nombre'], 'unidad' => $ind['unidad'], 'limite_maximo' => $ind['limite_maximo']]
            );
        }
    }
}
