<?php

namespace App\Domain\Analitica;

use App\Models\AlertaAbastecimiento;
use App\Models\ParametroInventario;
use App\Models\PronosticoDemanda;
use App\Support\NotificadorOperativo;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

/**
 * Persiste los resultados del motor de forma versionada e idempotente.
 */
class PersistenciaAnaliticaService
{
    /**
     * @param  array<string, mixed>  $resultado
     * @return array{parametros: int, pronosticos: int, alertas: int, notificadas: int}
     */
    public function guardar(array $resultado, string $origen = 'manual'): array
    {
        return DB::transaction(function () use ($resultado, $origen): array {
            $calculadoEn = now();
            $parametros = 0;
            $pronosticos = 0;
            $alertas = 0;
            $notificadas = 0;

            foreach ($resultado['parametros'] ?? [] as $fila) {
                if ($this->guardarParametro($fila, $origen, $calculadoEn)) {
                    $parametros++;
                }
            }

            foreach ($resultado['pronosticos'] ?? [] as $pronostico) {
                $pronosticos += $this->guardarPronostico($pronostico, $calculadoEn);
            }

            foreach ($resultado['alertas'] ?? [] as $alerta) {
                $modelo = $this->guardarAlerta($alerta);

                if ($modelo === null) {
                    continue;
                }

                $alertas++;

                if ($modelo->wasRecentlyCreated && in_array($modelo->severidad, ['critica', 'alta'], true)) {
                    $notificadas += $this->notificar($modelo);
                }
            }

            return [
                'parametros' => $parametros,
                'pronosticos' => $pronosticos,
                'alertas' => $alertas,
                'notificadas' => $notificadas,
            ];
        });
    }

    /**
     * @param  array<string, mixed>  $fila
     */
    private function guardarParametro(array $fila, string $origen, CarbonInterface $calculadoEn): bool
    {
        $datos = [
            'eoq' => $fila['eoq'] ?? null,
            'stock_seguridad' => $fila['stock_seguridad'] ?? null,
            'punto_reorden' => $fila['punto_reorden'] ?? null,
            'costo_total_relevante' => $fila['costo_total_relevante'] ?? null,
            'demanda_media_diaria' => $fila['demanda_media_diaria'] ?? 0,
            'demanda_anual' => $fila['demanda_anual'] ?? 0,
            'lead_time_dias' => $fila['lead_time_dias'] ?? null,
            'nivel_servicio' => $fila['nivel_servicio'] ?? 0.95,
            'clase_abc' => $fila['clase_abc'] ?? 'C',
            'clase_xyz' => $fila['clase_xyz'] ?? 'X',
            'clase_combinada' => $fila['clase_combinada'] ?? 'CX',
            'coeficiente_variacion' => $fila['coeficiente_variacion'] ?? 0,
            'estado' => $fila['estado'] ?? 'calculado',
            'modelo_version' => $fila['modelo_version'] ?? 'deterministic-1.0',
            'origen' => $origen,
            'payload' => $fila,
            'calculado_en' => $calculadoEn,
        ];

        $vigente = ParametroInventario::query()
            ->where('almacen_id', $fila['almacen_id'])
            ->where('material_id', $fila['material_id'])
            ->where('vigente', true)
            ->first();

        if ($vigente !== null && $this->mismosValores($vigente, $datos)) {
            $vigente->update(['calculado_en' => $calculadoEn, 'origen' => $origen]);

            return false;
        }

        ParametroInventario::query()
            ->where('almacen_id', $fila['almacen_id'])
            ->where('material_id', $fila['material_id'])
            ->where('vigente', true)
            ->update(['vigente' => false]);

        ParametroInventario::create([
            ...$datos,
            'almacen_id' => $fila['almacen_id'],
            'material_id' => $fila['material_id'],
            'vigente' => true,
        ]);

        return true;
    }

    /**
     * @param  array<string, mixed>  $datos
     */
    private function mismosValores(ParametroInventario $vigente, array $datos): bool
    {
        foreach (['eoq', 'stock_seguridad', 'punto_reorden', 'estado', 'modelo_version'] as $campo) {
            $anterior = $vigente->getAttribute($campo);
            $nuevo = $datos[$campo];

            if (is_numeric($anterior) && is_numeric($nuevo)) {
                if (abs((float) $anterior - (float) $nuevo) > 0.0001) {
                    return false;
                }

                continue;
            }

            if ((string) $anterior !== (string) $nuevo) {
                return false;
            }
        }

        return true;
    }

    /**
     * @param  array<string, mixed>  $pronostico
     */
    private function guardarPronostico(array $pronostico, CarbonInterface $calculadoEn): int
    {
        $fechas = $pronostico['fechas'] ?? [];
        $valores = $pronostico['valores'] ?? [];
        $inferiores = $pronostico['limite_inferior'] ?? [];
        $superiores = $pronostico['limite_superior'] ?? [];
        $guardados = 0;

        foreach ($fechas as $indice => $fecha) {
            $fechaDate = Carbon::parse($fecha)->toDateString();
            $datos = [
                'cantidad' => $valores[$indice] ?? 0,
                'limite_inferior' => $inferiores[$indice] ?? 0,
                'limite_superior' => $superiores[$indice] ?? 0,
                'mape' => $pronostico['mape'] ?? null,
                'rmse' => $pronostico['rmse'] ?? 0,
                'metodo_usado' => $pronostico['metodo_usado'] ?? 'media_movil',
                'baja_confianza' => (bool) ($pronostico['baja_confianza'] ?? false),
                'calculado_en' => $calculadoEn,
            ];

            $existente = PronosticoDemanda::query()
                ->where('almacen_id', $pronostico['almacen_id'])
                ->where('material_id', $pronostico['material_id'])
                ->where('modelo_version', $pronostico['modelo_version'] ?? 'deterministic-1.0')
                ->whereDate('fecha', $fechaDate)
                ->first();

            if ($existente !== null) {
                $existente->update($datos);
            } else {
                PronosticoDemanda::create([
                    ...$datos,
                    'almacen_id' => $pronostico['almacen_id'],
                    'material_id' => $pronostico['material_id'],
                    'fecha' => $fechaDate,
                    'modelo_version' => $pronostico['modelo_version'] ?? 'deterministic-1.0',
                ]);
            }

            $guardados++;
        }

        return $guardados;
    }

    /**
     * @param  array<string, mixed>  $alerta
     */
    private function guardarAlerta(array $alerta): ?AlertaAbastecimiento
    {
        if (! isset($alerta['clave_idempotente'])) {
            return null;
        }

        $modelo = AlertaAbastecimiento::firstOrCreate(
            ['clave_idempotente' => $alerta['clave_idempotente']],
            [
                'almacen_id' => $alerta['almacen_id'],
                'material_id' => $alerta['material_id'],
                'tipo' => $alerta['tipo'],
                'severidad' => $alerta['severidad'],
                'fecha_estimada' => isset($alerta['fecha_estimada'])
                    ? Carbon::parse($alerta['fecha_estimada'])->toDateString()
                    : null,
                'cantidad_sugerida' => $alerta['cantidad_sugerida'] ?? null,
                'detalle' => $alerta['detalle'] ?? '',
                'estado' => 'vigente',
            ],
        );

        if (! $modelo->wasRecentlyCreated) {
            $modelo->update([
                'severidad' => $alerta['severidad'],
                'detalle' => $alerta['detalle'] ?? $modelo->detalle,
                'cantidad_sugerida' => $alerta['cantidad_sugerida'] ?? $modelo->cantidad_sugerida,
            ]);
        }

        return $modelo;
    }

    private function notificar(AlertaAbastecimiento $alerta): int
    {
        $material = $alerta->material;
        $almacen = $alerta->almacen;

        return NotificadorOperativo::aRoles(
            ['jefe_logistica_compras', 'administrador_sistema'],
            'alerta_abastecimiento',
            'Alerta de abastecimiento: '.($material?->nombre ?? 'material'),
            mb_substr($alerta->detalle.' '.($almacen?->nombre ?? ''), 0, 240),
            'material',
            $alerta->material_id,
        );
    }
}
