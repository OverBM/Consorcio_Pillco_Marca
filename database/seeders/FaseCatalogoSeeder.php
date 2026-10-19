<?php

namespace Database\Seeders;

use App\Enums\FaseCicloVida;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Catálogo por defecto de requisitos y criterios de aprobación por fase.
 *
 * Los tipos de criterio son los soportados por el verificador tipado
 * (App\Domain\Project\EvaluadorCriteriosFase).
 */
class FaseCatalogoSeeder extends Seeder
{
    public function run(): void
    {
        $requisitos = [
            ['fase' => FaseCicloVida::Inicio->value, 'codigo' => 'expediente_tecnico', 'nombre' => 'Expediente técnico aprobado', 'descripcion' => 'Documento base del proyecto aprobado por la entidad.', 'orden' => 1],
            ['fase' => FaseCicloVida::Planificacion->value, 'codigo' => 'linea_base', 'nombre' => 'Línea base de costo y cronograma', 'descripcion' => 'Alcance, plazo y costo aprobados.', 'orden' => 1],
            ['fase' => FaseCicloVida::Ejecucion->value, 'codigo' => 'avance_fisico', 'nombre' => 'Avances físicos y valorizaciones', 'descripcion' => 'Registro periódico de metrados y valorizaciones.', 'orden' => 1],
            ['fase' => FaseCicloVida::MonitoreoControl->value, 'codigo' => 'control_cambios', 'nombre' => 'Control integrado de cambios', 'descripcion' => 'Solicitudes de cambio evaluadas y decididas.', 'orden' => 1],
            ['fase' => FaseCicloVida::Cierre->value, 'codigo' => 'acta_recepcion', 'nombre' => 'Acta de recepción de obra', 'descripcion' => 'Conformidad de la entidad contratante.', 'orden' => 1],
        ];

        foreach ($requisitos as $requisito) {
            DB::table('fase_requisitos')->updateOrInsert(
                ['fase' => $requisito['fase'], 'codigo' => $requisito['codigo']],
                [
                    'nombre' => $requisito['nombre'],
                    'descripcion' => $requisito['descripcion'],
                    'orden' => $requisito['orden'],
                    'activo' => true,
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }

        $criterios = [
            [
                'fase' => FaseCicloVida::Inicio->value,
                'codigo' => 'documento_base',
                'nombre' => 'Informe o expediente registrado',
                'tipo' => 'documento_existe',
                'parametros' => ['tipo_documento' => 'informe'],
                'umbral' => null,
            ],
            [
                'fase' => FaseCicloVida::Planificacion->value,
                'codigo' => 'linea_base_vigente',
                'nombre' => 'Línea base vigente',
                'tipo' => 'linea_base_costo',
                'parametros' => null,
                'umbral' => null,
            ],
            [
                'fase' => FaseCicloVida::Planificacion->value,
                'codigo' => 'hitos_planificados',
                'nombre' => 'Hitos planificados cumplidos',
                'tipo' => 'hitos_cumplidos_pct',
                'parametros' => null,
                'umbral' => 100,
            ],
            [
                'fase' => FaseCicloVida::Ejecucion->value,
                'codigo' => 'partidas_completas',
                'nombre' => 'Partidas con avance completo',
                'tipo' => 'partidas_avance_pct',
                'parametros' => null,
                'umbral' => 100,
            ],
            [
                'fase' => FaseCicloVida::Ejecucion->value,
                'codigo' => 'valorizaciones_aprobadas',
                'nombre' => 'Al menos una valorización aprobada',
                'tipo' => 'valorizaciones_aprobadas',
                'parametros' => null,
                'umbral' => 1,
            ],
            [
                'fase' => FaseCicloVida::MonitoreoControl->value,
                'codigo' => 'cambios_decididos',
                'nombre' => 'Cambios sin decisión pendiente',
                'tipo' => 'cambios_aprobados',
                'parametros' => null,
                'umbral' => null,
            ],
            [
                'fase' => FaseCicloVida::MonitoreoControl->value,
                'codigo' => 'sin_transferencias',
                'nombre' => 'Sin transferencias en tránsito',
                'tipo' => 'sin_transferencias_transito',
                'parametros' => null,
                'umbral' => null,
            ],
            [
                'fase' => FaseCicloVida::Cierre->value,
                'codigo' => 'acta_recepcion',
                'nombre' => 'Acta de recepción registrada',
                'tipo' => 'documento_existe',
                'parametros' => ['tipo_documento' => 'acta'],
                'umbral' => null,
            ],
            [
                'fase' => FaseCicloVida::Cierre->value,
                'codigo' => 'justificacion_cierre',
                'nombre' => 'Justificación de cierre',
                'tipo' => 'manual_justificado',
                'parametros' => null,
                'umbral' => null,
            ],
        ];

        foreach ($criterios as $index => $criterio) {
            DB::table('fase_criterios')->updateOrInsert(
                ['fase' => $criterio['fase'], 'codigo' => $criterio['codigo']],
                [
                    'nombre' => $criterio['nombre'],
                    'tipo' => $criterio['tipo'],
                    'parametros' => $criterio['parametros'] !== null ? json_encode($criterio['parametros']) : null,
                    'umbral' => $criterio['umbral'],
                    'obligatorio' => true,
                    'orden' => $index + 1,
                    'activo' => true,
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }
    }
}
