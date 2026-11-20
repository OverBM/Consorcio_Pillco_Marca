<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('CREATE INDEX IF NOT EXISTS idx_kardex_tipo_created ON kardex (tipo_movimiento, created_at)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_alertas_estado_tipo ON alertas (estado, tipo)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_hitos_fecha_estado ON hitos (fecha_planificada, estado)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_solicitudes_tipo_urgente_estado ON solicitudes (tipo, urgente, estado)');
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('DROP INDEX IF EXISTS idx_kardex_tipo_created');
        DB::statement('DROP INDEX IF EXISTS idx_alertas_estado_tipo');
        DB::statement('DROP INDEX IF EXISTS idx_hitos_fecha_estado');
        DB::statement('DROP INDEX IF EXISTS idx_solicitudes_tipo_urgente_estado');
    }
};
