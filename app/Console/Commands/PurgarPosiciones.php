<?php

namespace App\Console\Commands;

use App\Models\DespachoPosicion;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class PurgarPosiciones extends Command
{
    protected $signature = 'tracking:purgar';

    protected $description = 'Elimina posiciones de despacho fuera del período de retención.';

    public function handle(): int
    {
        $dias = (int) (DB::table('parametros_sistema')
            ->where('clave', 'tracking.retencion_dias')
            ->value('valor') ?? 30);

        if ($dias <= 0) {
            $this->error('La retención debe ser mayor que cero.');

            return self::FAILURE;
        }

        $eliminadas = DespachoPosicion::query()
            ->where('capturada_en', '<', now()->subDays($dias))
            ->delete();

        $this->info("Posiciones eliminadas: {$eliminadas} (retención {$dias} días).");

        return self::SUCCESS;
    }
}
