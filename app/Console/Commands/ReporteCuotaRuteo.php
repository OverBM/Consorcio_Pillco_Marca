<?php

namespace App\Console\Commands;

use App\Models\RuteoConsumo;
use Illuminate\Console\Command;

class ReporteCuotaRuteo extends Command
{
    protected $signature = 'ruteo:reporte-cuota {--dias=7 : Días a analizar}';

    protected $description = 'Muestra el consumo diario del proveedor de ruteo y su proyección.';

    public function handle(): int
    {
        $dias = max(1, (int) $this->option('dias'));
        $desde = now()->subDays($dias - 1)->toDateString();

        $consumos = RuteoConsumo::query()
            ->where('fecha', '>=', $desde)
            ->orderBy('fecha')
            ->orderBy('driver')
            ->get();

        if ($consumos->isEmpty()) {
            $this->warn('No hay consumo registrado en el período.');

            return self::SUCCESS;
        }

        $filas = $consumos->map(fn (RuteoConsumo $consumo): array => [
            $consumo->fecha->toDateString(),
            $consumo->driver,
            $consumo->llamadas,
            $consumo->exitos,
            $consumo->fallos,
            $consumo->geocodificaciones,
        ])->all();

        $this->table(
            ['Fecha', 'Driver', 'Llamadas', 'Éxitos', 'Fallos', 'Geocoding'],
            $filas,
        );

        $llamadas = (int) $consumos->sum('llamadas');
        $exitos = (int) $consumos->sum('exitos');
        $fallos = (int) $consumos->sum('fallos');
        $presupuesto = (int) config('ruteo.presupuesto_diario', 1500);
        $diasConDatos = max($consumos->pluck('fecha')->unique()->count(), 1);
        $promedio = round($llamadas / $diasConDatos, 1);

        $this->newLine();
        $this->line("Llamadas: {$llamadas} · Éxitos: {$exitos} · Fallos: {$fallos}");
        $this->line("Promedio diario: {$promedio} de {$presupuesto} permitidas.");
        $this->line('Proyección semanal: '.round($promedio * 7, 1).' llamadas.');

        if ($promedio > $presupuesto * 0.8) {
            $this->warn('El consumo supera el 80% del presupuesto diario. Ajusta el caché o el límite.');
        }

        return self::SUCCESS;
    }
}
