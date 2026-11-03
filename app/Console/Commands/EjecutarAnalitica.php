<?php

namespace App\Console\Commands;

use App\Domain\Analitica\AnaliticaClient;
use App\Domain\Analitica\PersistenciaAnaliticaService;
use App\Domain\Analitica\SeriesDemandaService;
use App\Models\EjecucionAnalitica;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

class EjecutarAnalitica extends Command
{
    protected $signature = 'analitica:ejecutar
        {--almacen= : Limita el pipeline a un almacén}
        {--material= : Limita el pipeline a un material}
        {--origen=manual : Origen de la ejecución (manual|programado)}
        {--force : Ignora el lock de ejecución}';

    protected $description = 'Ejecuta el motor predictivo y persiste parámetros, pronósticos y alertas.';

    public function handle(
        SeriesDemandaService $series,
        AnaliticaClient $client,
        PersistenciaAnaliticaService $persistencia,
    ): int {
        $lock = Cache::lock('analitica:ejecutar', 3600);

        if (! $this->option('force') && ! $lock->get()) {
            $this->error('Ya hay una ejecución de analítica en curso.');

            return self::FAILURE;
        }

        $inicio = now();
        $ejecucion = EjecucionAnalitica::create([
            'origen' => (string) $this->option('origen'),
            'estado' => 'en_proceso',
            'inicio' => $inicio,
        ]);

        try {
            $payload = $series->payloadSeries(
                90,
                null,
                $this->option('almacen') !== null ? (int) $this->option('almacen') : null,
                $this->option('material') !== null ? (int) $this->option('material') : null,
            );

            $resultado = $client->pipeline($series->payloadParaMotor($payload));
            $conteos = $persistencia->guardar($resultado, (string) $this->option('origen'));

            $ejecucion->update([
                'estado' => 'completada',
                'fin' => now(),
                'duracion_ms' => (int) $inicio->diffInMilliseconds(now()),
                'series' => count($payload['series']),
                'calculadas' => $conteos['parametros'],
                'alertas' => $conteos['alertas'],
                'errores' => 0,
                'mensaje' => "Pronósticos: {$conteos['pronosticos']}. Notificadas: {$conteos['notificadas']}.",
            ]);

            $this->info(
                "Analítica completada: {$conteos['parametros']} parámetros, "
                ."{$conteos['pronosticos']} pronósticos, {$conteos['alertas']} alertas."
            );

            return self::SUCCESS;
        } catch (Throwable $error) {
            $ejecucion->update([
                'estado' => 'fallida',
                'fin' => now(),
                'duracion_ms' => (int) $inicio->diffInMilliseconds(now()),
                'errores' => 1,
                'mensaje' => mb_substr($error->getMessage(), 0, 500),
            ]);

            Log::error('Fallo la ejecución de analítica predictiva.', [
                'ejecucion_id' => $ejecucion->id,
                'mensaje' => $error->getMessage(),
            ]);

            $this->error('No se pudo ejecutar la analítica: '.$error->getMessage());

            return self::FAILURE;
        } finally {
            if (! $this->option('force')) {
                $lock->release();
            }
        }
    }
}
